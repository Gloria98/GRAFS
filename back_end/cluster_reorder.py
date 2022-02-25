import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
import time
import scipy
import scipy.cluster.hierarchy as sch
from scipy.spatial.distance import squareform
import functools


def cluster_to_matrix(clusters):
    num_clusters = len(clusters)
    corr_matrix = np.zeros((num_clusters, num_clusters), dtype=np.float)
    for i, cluster in enumerate(clusters):
        corr_matrix[i, i] = len(cluster['documents'])
        d_list1 = cluster['documents']
        for j in range(i, num_clusters):
            d_list2 = clusters[j]['documents']
            intersection = 0
            for did in d_list1:
                if did in d_list2:
                    intersection += 1
            corr_matrix[i, j] = intersection
            corr_matrix[j, i] = intersection
    return corr_matrix


def connect(idx_to_cluster, idx1, idx2):
    if idx2 < idx1:
        tmp = idx1
        idx1 = idx2
        idx2 = tmp
    if (idx_to_cluster[idx1]==idx1) and (idx_to_cluster[idx2]==idx2):
        idx_to_cluster[idx2] = idx1
    elif idx_to_cluster[idx1]==idx1:
        connect(idx_to_cluster, idx1, idx_to_cluster[idx2])
    elif idx_to_cluster[idx2]==idx2:
        connect(idx_to_cluster, idx_to_cluster[idx1], idx2)
    else:
        connect(idx_to_cluster, idx_to_cluster[idx1], idx_to_cluster[idx2])

def connect_final(idx_to_cluster, idx1, idx2):
    if idx2 < idx1:
        tmp = idx1
        idx1 = idx2
        idx2 = tmp
    if idx_to_cluster[idx1]==idx1:
        idx_to_cluster[idx2] = idx1
    else:
        connect_final(idx_to_cluster, idx_to_cluster[idx1], idx2)

def cluster_max_size(num_instance, linkage, max_size):
    idx_to_cluster = np.arange(0, num_instance + len(linkage))
    for i in range(len(linkage)):
        row = linkage[i, :]
        if int(row[3]) <= max_size:
            idx1 = int(row[0])
            idx2 = int(row[1])
            connect(idx_to_cluster, idx1, i + num_instance)
            connect(idx_to_cluster, idx1, idx2)
    for i in range(num_instance):
        connect_final(idx_to_cluster[:num_instance], idx_to_cluster[i], i)
    return idx_to_cluster[:num_instance]

def corr_to_dist(corr_array):
    dist_array = np.zeros(corr_array.shape)
    for i in range(len(corr_array)):
        for j in range(i, len(corr_array)):
            dist_array[i, j] = corr_array[i, i] + corr_array[j, j] - 2 * corr_array[i, j]
            dist_array[j, i] = corr_array[i, i] + corr_array[j, j] - 2 * corr_array[i, j]
    dist_dense = squareform(dist_array)
    return dist_dense

def add_color(n, idx, color_list):
    if len(n["children"]) == 0:
        n["color"] = color_list[n["node_id"]]
    else:
        for child in n["children"]:
            add_color(child, idx, color_list)


def cluster_corr(corr_array, inplace=False):
    pairwise_distances = corr_to_dist(corr_array)
    linkage = sch.linkage(pairwise_distances, method='complete')
    idx1 = plot_matrix_dendrogram(corr_array, linkage)
    d3_json = linkage_to_tree(linkage)
    cluster_distance_threshold1 = int(len(corr_array)/3)
    idx_to_cluster_array1 = cluster_max_size(len(corr_array), linkage, cluster_distance_threshold1)
    unique_clusters = list(np.unique(idx_to_cluster_array1))
    idx_to_cluster1 = [unique_clusters.index(int(idx)) for idx in idx_to_cluster_array1]
    add_color(d3_json, idx1, idx_to_cluster1)
    # arranged by clusters
    idx = np.argsort(idx_to_cluster_array1)
    
    if not inplace:
        corr_array = corr_array.copy()
    
    if isinstance(corr_array, pd.DataFrame):
        return corr_array.iloc[idx, :].T.iloc[idx, :]
    return corr_array[idx, :][:, idx], idx1, idx_to_cluster1, d3_json

# Create a nested dictionary from the ClusterNode's returned by SciPy
def add_node(node, parent ):
    # First create the new node and append it to its parent's children
    newNode = dict( node_id=node.id, children=[] )
    parent["children"].append( newNode )

    # Recursively add the current node's children
    if node.left: add_node( node.left, newNode )
    if node.right: add_node( node.right, newNode )

def linkage_to_tree(linkage):
    T = sch.to_tree(linkage , rd=False )
    d3Dendro = dict(children=[], name="Root1")
    add_node( T, d3Dendro )
    return d3Dendro

def plot_matrix_dendrogram(corr_array, linkage):
    Z2 = sch.dendrogram(linkage)
    idx1 = Z2['leaves']
    idx2 = Z2['leaves']
    D = corr_array.copy()
    D = D[idx1,:]
    D = D[:,idx2]
    return idx1

def label_tree( n, id2name, id2value):
    # If the node is a leaf, then we have its name
    if len(n["children"]) == 0:
        leafNames = [ id2name[n["node_id"]] ]
        n["name"] = leafNames[0]
        n["value"] = id2value[n["node_id"]]
    
    # If not, flatten all the leaves in the node's subtree
    else:
        leafNames = functools.reduce(lambda ls, c: ls + label_tree(c, id2name, id2value), n["children"], [])

    # Delete the node id since we don't need it anymore and
    # it makes for cleaner JSON
    # del n["node_id"]

    # Labeling convention: "-"-separated leaf names
    n["name"] = name = "-".join(sorted(map(str, leafNames)))

    return leafNames


def reorder_cluster(clusters):
    cluster_names = []
    cluster_size = []
    for cluster in clusters:
        cluster_names.append(cluster['labels'][0])
        cluster_size.append(len(cluster['documents']))
    corr_matrix = cluster_to_matrix(clusters)
    new_corr_matrix, reorder_idx, idx_to_cluster1, d3_json = cluster_corr(corr_matrix)
    new_cluster_names = []
    for i in reorder_idx:
        new_cluster_names.append(cluster_names[i])
    label_tree(d3_json, cluster_names, cluster_size)
    return reorder_idx, idx_to_cluster1, d3_json['children'][0]

def reorder_by_type(clusters, concepts_original):
    idx_to_cluster = []
    for cluster in clusters:
        idx_to_cluster.append(concepts_original[cluster['cid']].concept_type)
    reorder_idx = np.argsort(idx_to_cluster)
    pos = [-1, -1, -1, -1, -1, -1]
    curr_type = -1
    for i, cluster_id in enumerate(reorder_idx):
        t = idx_to_cluster[cluster_id]
        if t != curr_type:
            curr_type = t
            pos[curr_type] = i
    non_zero_pos = [i for i in pos if (i >= 0)]
    non_zero_pos.append(len(clusters))
    sorted_idx = []
    for i in range(len(non_zero_pos)-1):
        tmp = list(reorder_idx[non_zero_pos[i]:non_zero_pos[i + 1]])
        tmp.sort()
        sorted_idx += tmp
    return sorted_idx, idx_to_cluster, pos
