# This is the RESTful API module

from flask import Flask, jsonify, request, session
from flask_restful import reqparse, abort, Resource, Api
from flask_cors import CORS, cross_origin
from flask_session import Session
import json
import time

from query_builder import solr_query_builder
from document_searcher import solr_document_searcher
from text_parser import search_result_parser
from text_parser import concept2dic, dic2concept
from cluster_concept import *
from cluster_reorder import reorder_cluster, reorder_by_type
from highlight_labels import process_highlight
from concept_cluster import concept_clustering, edit_cluster
from concept_summary import extract_sent_candids, generate_summary
import os

app = Flask(__name__)
app.secret_key = b'Z\x17s\xcf!!\xcd\x84\x07\x1e2(\x8fk\x1dX\x8f\x1a\x96\x99\x87zO\x98'
app.config["SESSION_TYPE"] = "filesystem"
app.config["SESSION_PERMANENT"] = False
Session(app)
CORS(app)

# TODO
def is_valid_request(json_data):
    if json_data['advanced']:
        return True, ""
    if 'event' not in json_data:
        return False, '"event" key is not in request json.'
    for concept in json_data['event']:
        if 'name' not in concept:
            return False, '"name" key is not in concept {}'.format(concept)
        if 'importance' not in concept:
            return False, '"importance" key is not in {}'.format(concept)
        try:
            float(concept['importance'])
        except:
            return False, '"importance" value is not a valid number: "{}" in {}'.format(concept['importance'], concept)
    return True, ''

# api for query submission
# return results in json
@app.route('/search/query', methods=['POST'])
@cross_origin(supports_credentials=True)
def SearchAPI():
    json_data = request.get_json(force=True)
    is_valid, error_msg = is_valid_request(json_data)
    
    if is_valid:
        # advanced query means the query is written in a format that can be directly used by solr
        if json_data['advanced']:
            query_string = json_data['advanced_query']
            free_text = json_data['free_text_query']
        # if the search query is free text, we need to do some preprocess
        else:
            query_string, free_text = solr_query_builder(json_data)
        
        # solr search
        solr_results = solr_document_searcher(query_string, True, json_data['num_docs'])
        # specify the number of documents we want to analyze
        top_k_docs = min(int(json_data['num_docs']), len(solr_results['response']['docs']))
        # collect all the mentioned concepts
        concepts_original = search_result_parser(solr_results, True, top_k_docs)
        # number of clusters or concepts to be displayed
        num_clusters = int(json_data['num_clusters'])
        # generate clusters (in this case this process is equivalent to selecting a set of concept)
        clusters = concept_clustering(concepts_original, num_clusters, top_k_docs)
        # generate summaries for each cluster
        for cluster in clusters:
            summary = generate_summary(free_text, cluster['documents'], cluster['cid'], solr_results['response']['docs'], 3, snomed=(json_data['snomed']==0))
            cluster['summary'] = summary

        # the baseline system doesn't need clustering
        if json_data['v_baseline']:
            clusters = sorted(clusters, key = lambda x: len(x['documents']), reverse = True)
            reorder_index, idx_to_groups, pos = reorder_by_type(clusters, concepts_original)
        else:
            reorder_index, idx_to_groups, d3_json = reorder_cluster(clusters)

        cluster_idx = [int(idx) for idx in reorder_index]
        concepts_original_json = concept2dic(concepts_original)
        # keyword recommendation for each cluster, but not used in current interface
        clusters = process_cluster_concept(solr_results, clusters, 5, concepts_original)
        
        if json_data['v_baseline']:
            content={'solr_results':solr_results,
                    'clusters': clusters,
                    "cluster_order": cluster_idx,
                    "idx_to_groups": idx_to_groups, # put clusters into groups, determine its color
                    "type_pos": pos,
                    "must_exclude": []}
        else:
            content={'solr_results':solr_results,
                    'clusters': clusters,
                    "cluster_order": cluster_idx,
                    "idx_to_groups": idx_to_groups, # put clusters into groups, determine its color
                    "d3_json": d3_json,
                    "must_exclude": [],
                    "concepts_original": concepts_original_json}
        response=jsonify(content)
        print(response.headers)
        return response

    else:
        response = {"message": "Wrong JSON format: " + error_msg}
        return response

# api used for the case when the original cluster is modified by the user
@app.route('/search/edit_cluster', methods=['POST'])
@cross_origin(supports_credentials=True)
def EditClusterAPI():
    json_data = request.get_json(force=True)
    is_valid = True
    if is_valid:
        # collect necessary data from the json request
        concepts_original = dic2concept(json_data['concepts_original'])
        current_clusters = json_data['clusters']
        solr_results = json_data['solr_results']
        top_k_docs = json_data['top_k_docs']
        new_clusters = []

        # for deletion of concepts
        if json_data['action']=='delete':
            json_data['must_exclude'].append(json_data['cid'])
            new_clusters = [cluster for cluster in current_clusters if cluster['cid'] not in json_data['must_exclude']]
        # for adding concepts
        else:
            for cid in json_data['cid']:
                # create the new concept object
                c_object = concepts_original[cid]
                labels = []
                lower_labels = []
                for label in list(c_object.mentions):
                    if label.lower() not in lower_labels:
                        labels.append(label)
                        lower_labels.append(label.lower())
                summary = generate_summary(json_data['free_text'], list(c_object.docids), cid, solr_results['response']['docs'], 3, snomed=True)
                c_dict = {
                    "labels": labels,
                    "documents": list(c_object.docids),
                    "cid": cid,
                    "summary": summary,
                    "c_type": c_object.concept_type
                }
                # append the new concept to the end of list
                current_clusters.append(c_dict)
                # if the concept was excluded by the user previously, we need to remove that from the must_exclude list
                if cid in json_data['must_exclude']:
                    json_data['must_exclude'].remove(cid)
            new_clusters = current_clusters
        
        # do the same set of cluster processing steps as in the query api
        reorder_index, idx_to_groups, d3_json = reorder_cluster(new_clusters)
        cluster_idx = [int(idx) for idx in reorder_index]
        clusters = process_cluster_concept(solr_results, new_clusters, 5, concepts_original)
        exclude_info = {}
        for cid in json_data['must_exclude']:
            exclude_info[cid] = {"labels": list(concepts_original[cid].mentions)[0], "size": len(concepts_original[cid].docids)}
        content={
                'clusters': clusters,
                "cluster_order": cluster_idx,
                "idx_to_groups": idx_to_groups, # put clusters into groups, determine its color
                "d3_json": d3_json,
                "must_exclude": json_data['must_exclude'],
                "exclude_info": exclude_info}
        response = jsonify(content)
        return response

# this api produce keyword recommendation for user selected clusters
# not used in current interface
@app.route('/search/cluster_score', methods=['POST'])
@cross_origin(supports_credentials=True)
def ConceptAPI():
    json_data = request.get_json(force=True)
    is_valid = True
    if is_valid:
        top_k_docs = int(json_data['num_docs'])
        solr_results = json_data['solr_results']
        clusters = json_data['clusters']
        selected_clusters = json_data['selected_clusters'] # a list of selected cluster ids
        concepts_original = search_result_parser(solr_results, True, top_k_docs)
        intersect_cluster = process_cluster_concept_one(solr_results, clusters, 5, concepts_original, selected_clusters)
        content = {'intersect_cluster': intersect_cluster}
        response=jsonify(content)
        print(response)
        return response
    else:
        response = {"message": "Wrong JSON format: " + error_msg}
        return response

# generate highlight based on user selection
@app.route('/search/highlight_label', methods=['POST'])
@cross_origin(supports_credentials=True)
def HighlightLabelAPI():
    json_data = request.get_json(force=True)
    target_clusters = json_data['target_clusters']
    print(target_clusters)
    docs = json_data['docs']
    if len(target_clusters)==0:
        content = {"docs": docs}
    else:
        new_docs = []
        for doc in docs:
            nd = process_highlight(doc, target_clusters)
            new_docs.append(nd)
        content = {"docs": new_docs}
    response = jsonify(content)
    return response

# keeping the user action log
@app.route('/save_actions', methods=['POST'])
@cross_origin(supports_credentials=True)
def save_actions():
    if not os.path.exists("action_log"):
        os.mkdir("action_log")
    json_data = request.get_json(force=True)
    client_id = json_data['id']
    filename = f"{client_id}.jsonl"
    with open(f"action_log/{filename}", 'a') as log_file:
        log_file.write(json.dumps(json_data['json']) + "\n")
    response = jsonify({})
    return response

'''
    info_focus_dict = {"event":[      
                          { 
                             "name":"ICD10 F17",
                             "importance":"10"
                          },
                          {
                             "name":"ICD10 G89",
                             "importance":"7"
                          }
                       ]}
'''
     
if __name__ == '__main__':
    app.run(host="0.0.0.0",debug = True, port = 8985)

