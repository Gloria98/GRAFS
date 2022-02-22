#!/bin/bash

wget https://archive.apache.org/dist/lucene/solr/8.4.1/solr-8.4.1.zip

unzip solr-8.4.1.zip
solr-8.4.1/bin/solr start -m 4g # solr will run on port 8983
solr-8.4.1/bin/solr create_core -c PubMedDemo

curl -X POST -H 'Content-type:application/json' --data-binary '{
  "add-field":{
     "name":"pmid",
     "type":"string",
     "stored":true,
     "indexed":true}
}' http://localhost:8983/api/cores/PubMedDemo/schema

curl -X POST -H 'Content-type:application/json' --data-binary '{
  "add-field":{
     "name":"title",
     "type":"text_general",
     "stored":true,
     "indexed":true}
}' http://localhost:8983/api/cores/PubMedDemo/schema

curl -X POST -H 'Content-type:application/json' --data-binary '{
  "add-field":{
     "name":"abstract",
     "type":"text_general",
     "stored":true,
     "indexed":true}
}' http://localhost:8983/api/cores/PubMedDemo/schema

curl -X POST -H 'Content-type:application/json' --data-binary '{
  "add-field":{
     "name":"journal",
     "type":"string",
     "stored":true,
     "indexed":false}
}' http://localhost:8983/api/cores/PubMedDemo/schema

curl -X POST -H 'Content-type:application/json' --data-binary '{
  "add-field":{
     "name":"journal_id",
     "type":"string",
     "stored":true,
     "indexed":false}
}' http://localhost:8983/api/cores/PubMedDemo/schema

curl -X POST -H 'Content-type:application/json' --data-binary '{
  "add-field":{
     "name":"date",
     "type":"pdate",
     "stored":true,
     "indexed":true}
}' http://localhost:8983/api/cores/PubMedDemo/schema

curl -X POST -H 'Content-type:application/json' --data-binary '{
  "add-field":{
     "name":"heading_term",
     "type":"text_general",
     "stored":true,
     "indexed":true}
}' http://localhost:8983/api/cores/PubMedDemo/schema

curl -X POST -H 'Content-type:application/json' --data-binary '{
  "add-field":{
     "name":"heading_id",
     "type":"strings",
     "stored":true,
     "indexed":true}
}' http://localhost:8983/api/cores/PubMedDemo/schema

curl -X POST -H 'Content-type:application/json' --data-binary '{
  "add-field":{
     "name":"keyword",
     "type":"text_general",
     "stored":true,
     "indexed":true}
}' http://localhost:8983/api/cores/PubMedDemo/schema

curl -X POST -H 'Content-type:application/json' --data-binary '{
  "add-field":{
     "name":"abstract_sen",
     "type":"string",
     "stored":true,
     "indexed":false}
}' http://localhost:8983/api/cores/PubMedDemo/schema

curl -X POST -H 'Content-type:application/json' --data-binary '{
  "add-field":{
     "name":"abstract_snomed_ents",
     "type":"string",
     "stored":true,
     "indexed":false}
}' http://localhost:8983/api/cores/PubMedDemo/schema

curl -X POST -H 'Content-type:application/json' --data-binary '{
  "add-field":{
     "name":"title_snomed_ents",
     "type":"string",
     "stored":true,
     "indexed":false}
}' http://localhost:8983/api/cores/PubMedDemo/schema

curl -X POST -H 'Content-type:application/json' --data-binary '{
  "add-field":{
     "name":"snomed_codes",
     "type":"strings",
     "stored":true,
     "indexed":true}
}' http://localhost:8983/api/cores/PubMedDemo/schema

solr-8.4.1/bin/post -c PubMedDemo ../output/pubmed22n1114_extracted_snomed_terms.jsonl

# curl -X POST -H 'Content-Type: application/json' --data-binary '{"delete":{"query":"*:*" }}' http://localhost:8983/solr/PubMedDemo/update