# This module parses the search results, identifies medical entities/concepts
# in these results, and returns a result object 

import requests
import json
from nltk.stem import PorterStemmer


#CTAKES_URL_PREFIX_LOCAL = 'http://localhost:12346/ctakes-web-rest/service/analyze?pipeline=Default'
#CTAKES_URL_PREFIX_SERVER = 'http://localhost:8080/ctakes-web-rest/service/analyze?pipeline=Default'

Concept2type = {
    "T017": 0, "T029": 0, "T023": 0, "T030": 0, "T031": 0, "T022": 0, "T025": 0, "T026": 0, "T018": 0, "T021": 0, "T024": 0,
    "T020": 1, "T190": 1, "T049": 1, "T019": 1, "T047": 1, "T050": 1, "T033": 1, "T037": 1, "T048": 1, "T191": 1, "T046": 1,
    "T184": 2,
    "T060": 3, "T065": 3, "T058": 3, "T063": 3, "T062": 3, "T061": 3,
    "T059": 4,
    "T116": 5, "T195": 5, "T123": 5, "T122": 5, "T103": 5, "T120": 5, "T104": 5, "T200": 5, "T196": 5, "T126": 5, "T131": 5,
    "T125": 5, "T129": 5, "T130": 5, "T197": 5, "T114": 5, "T109": 5, "T121": 5, "T192": 5, "T127": 5
}

def search_result_parser(search_result,local,top_k_docs):
    porter = PorterStemmer()
    parsed_results = search_result['response']
    concepts = {}
    for i, doc in enumerate(parsed_results['docs'][:top_k_docs]):
        pmid = doc['pmid']
        title_ents=json.loads(doc['title_snomed_ents'])
        title_spans=[]
        for ent in title_ents:
            concepts, cui_list = update_concept_set(concepts, ent, pmid, i)
            span= ent[0:2]
            title_spans.append({'span':span, 'cui_list': cui_list})
        doc['title_spans']=title_spans
        abstract_ents=json.loads(doc['abstract_snomed_ents'])
        abstract_spans=[]
        for ent in abstract_ents:
            concepts, cui_list = update_concept_set(concepts, ent, pmid, i)
            span=ent[0:2]
            abstract_spans.append({'span':span, 'cui_list': cui_list})
        doc['abstract_spans']=abstract_spans

    concepts = {k: v for k, v in sorted(concepts.items(), key=lambda item: len(item[1].docids), reverse=True)} 
    return concepts


class Concept(object):
    def __init__(self):
        self.cui = ''             # cui of this concept
        self.snomed_codes = set() # snomed-ct codes under this cui (can have more than one)
        self.mentions = set()     # string mentions in documents 
        self.pmids = set()        # pmid array, where this concept is mentioned
        self.net_count = 0
        self.clusters = set()
        self.docids = set()
       
    
    def __init__(self, cui, snomed_codes, mention, pmid, net_count, docids, concept_type):
        self.cui = cui
        self.snomed_codes = set(snomed_codes)
        self.mentions = set(mention)
        self.pmids = set(pmid)
        self.net_count = net_count
        self.clusters = set()
        self.docids = set(docids)
        self.concept_type = concept_type
      
def concept2dic(concepts):
    json = {}
    for cui,concept in concepts.items():
        json[cui]={}
        json[cui]['mentions']=list(concept.mentions)
        json[cui]['pmids']=list(concept.pmids)
        json[cui]['net_count'] = concept.net_count
        json[cui]['clusters'] = list(concept.clusters)
        json[cui]['docids'] = list(concept.docids)
        json[cui]['concept_type'] = concept.concept_type
    return json

def dic2concept(concepts_json):
    concepts = {}
    for cui,concept in concepts_json.items():
        c_object = Concept(cui, [], concept['mentions'], concept['pmids'], concept['net_count'], concept['docids'], concept['concept_type'])
        # c_object.cui = cui
        # c_object.mentions = set(concept['mentions'])
        # c_object.pmids = set(concept['pmids'])
        # c_object.net_count = concept['ned_count']
        # c_object.clusters = set(concept['clusters'])
        # c_object.docids = set(concept['docids'])
        concepts[cui] = c_object
    return concepts


def update_concept_set(concepts, step_code_string, pmid, docid):
    punctuation=['.',',','"',";",':',"'"]
    text=step_code_string[3].strip(".,\"':;()")
    #for each in punctuation:
    text=text
    text=text[0].upper()+text[1:]
    cui_snomeds=step_code_string[2].split(".")
    cui_list = []
    for cui_snomed in cui_snomeds:
        cui=cui_snomed.split(";")[0]
        cui_list.append(cui)
        snomeds=cui_snomed.split(";")[2].split(",")
        c_types = cui_snomed.split(";")[1].split(",")
        c_type = Concept2type[c_types[0]]
        if cui not in concepts:
            concepts[cui] = Concept(cui,snomeds, [text], [pmid], 1, [docid], c_type)
        else:
            concepts[cui].mentions.add(text)
            concepts[cui].pmids.add(pmid)
            concepts[cui].docids.add(docid)
            concepts[cui].net_count += 1
            for snomed in snomeds:
                concepts[cui].snomed_codes.add(snomed)
                  
    return concepts, cui_list

'''
# Unit test
if __name__ == '__main__':
    #search_results = json.loads('{"responseHeader": {"status": 0, "QTime": 1, "params": {"q": "abstract:nicotine^1.0 OR title:nicotine^1.0 OR abstract:tobacco^1.0 OR title:tobacco^1.0 OR abstract:pain^1.0 OR title:pain^1.0 OR abstract:opioid^5.0 OR title:opioid^5.0", "start": "0", "rows": "2"}}, "response": {"numFound": 569904, "start": 0, "docs": [{"pmid": ["26375198"], "abstract": ["Practitioners are highly likely to encounter patients with concurrent use of nicotine products and opioid analgesics. Smokers present with more severe and extended chronic pain outcomes and have a higher frequency of prescription opioid use. Current tobacco smoking is a strong predictor of risk for nonmedical use of prescription opioids. Opioid and nicotinic-cholinergic neurotransmitter systems interact in important ways to modulate opioid and nicotine effects: dopamine release induced by nicotine is dependent on facilitation by the opioid system, and the nicotinic-acetylcholine system modulates self-administration of several classes of abused drugs-including opioids. Nicotine can serve as a prime for the use of other drugs, which\u00a0in the case of the opioid system may be bidirectional.\u00a0Opioids and compounds in tobacco, including nicotine, are metabolized by the cytochrome P450 enzyme system, but the metabolism of opioids and tobacco products can be complicated. Accordingly, drug interactions are possible but not always clear. Because of these issues, asking about nicotine use in patients taking opioids for pain is recommended. When assessing patient tobacco use, practitioners should also obtain information on products other than cigarettes, such as cigars, pipes, smokeless tobacco, and electronic nicotine delivery systems (ENDS, or e-cigarettes). There are multiple forms of behavioral therapy and pharmacotherapy available to assist patients with smoking cessation, and opioid agonist maintenance and pain clinics represent underutilized opportunities for nicotine intervention programs. "], "title": ["Opioid Analgesics and Nicotine: More Than Blowing Smoke."], "id": "d07fa82a-50bd-4b97-962e-33f9deb1a3da", "_version_": 1657146476516605953}, {"pmid": ["22968666"], "abstract": ["Recurrent use of prescription opioid analgesics by chronic pain patients may result in opioid dependence, which involves implicit neurocognitive operations that organize and impel craving states and compulsive drug taking behavior. Prior studies have identified an attentional bias (AB) towards heroin among heroin dependent individuals. The aim of this study was to determine whether opioid-dependent chronic pain patients exhibit an AB towards prescription opioid-related cues. Opioid-dependent chronic pain patients (n\u00a0=\u00a032) and a comparison group of non-dependent opioid users with chronic pain (n\u00a0=\u00a033) completed a dot probe task designed to measure opioid AB. Participants also rated their opioid craving and self-reported arousal associated with opioid-related and neutral images, pain severity, and relief from pain treatments. Repeated-measures ANOVA revealed a significant group (opioid-dependent vs. non-dependent opioid user)\u00a0\u00d7\u00a0presentation duration (200. vs. 2,000\u00a0ms.) interaction, such that opioid-dependent individuals evidenced a significant AB towards opioid cues presented for 200\u00a0ms but not for cues presented for 2,000\u00a0ms, whereas non-dependent opioid users did not exhibit a significant mean AB at either stimulus duration. Among opioid-dependent individuals, 200\u00a0ms opioid AB was significantly associated with opioid craving, while among non-dependent opioid users, 200\u00a0ms opioid AB was significantly associated with relief from pain treatments. Furthermore, dependent and non-dependent opioid users experienced opioid cues as significantly more arousing than neutral cues. Opioid dependence among chronic pain patients appears to involve an automatic AB towards opioid-related cues. When coupled with chronic pain, attentional fixation on opioid cues may promote compulsive drug use and addictive behavior. "], "title": ["Attentional bias for prescription opioid cues among opioid dependent chronic pain patients."], "id": "77994cc2-64b1-47cd-b4bc-978bb0db0e7a", "_version_": 1657142172485419010}]}}')
    search_results = json.loads('{"responseHeader": {"status": 0, "QTime": 1, "params": {"q": "ab5.0", "start": "0", "rows": "2"}}, "response": {"numFound": 569904, "start": 0, "docs": [{"pmid": ["26375198"], "abstract": ["Practitioners are highly likelu"],"title":["xxn"]}]}}')
    key_terms=['ab','bc']
    search_results = search_result_parser(search_results,key_terms)
    print (search_results)

'''