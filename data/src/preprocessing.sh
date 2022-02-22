#!/bin/bash

# the following input files are inputs


xml_path='../input/pubmed22n1114.xml'
MRCONSO_path='../input/MRCONSO.RRF'
MRSTY_path='../input/MRSTY.RRF'
needed_types='../input/ctakes_semantic_types.json'
stopword_list='../input/stopword_list.txt'


# extract SNOMED-CT terms and their semantic types from UMLS
snomed_map='../output/snomed_map.txt'
python take_snomed.py $MRCONSO_path $snomed_map

filtered_snomed_map='../output/filtered_snomed_map.txt'
python filter_mapping_by_type.py $needed_types $MRSTY_path $snomed_map $filtered_snomed_map

snomed_str2code='../output/snomed_str2code.txt'
python convert_snomed_map_to_str2code.py $filtered_snomed_map $snomed_str2code



# convert PubMed XML into a JSON file for Solr indexing
jsonl_path='../output/pubmed22n1114.jsonl'
python parse_medline_xml.py $xml_path $jsonl_path

extracted_snomed_terms_jsonl_path='../output/pubmed22n1114_extracted_snomed_terms.jsonl'
python extract_snomed_terms.py $snomed_str2code $stopword_list $jsonl_path $extracted_snomed_terms_jsonl_path

exit

# Download Solr, setup a core with field specifications as described in Google Doc.
# suppose the Solr core is named PubMedDemo.
solr_core_name='PubMedDemo'
path/to/solr/bin/post $solr_core_name $extracted_snomed_terms_jsonl_path

