# This module takes an information focus object and turn it into a Lucene/Solr
# query string

# below are a few tutorials
# https://lucene.apache.org/solr/guide/8_4/query-syntax-and-parsing.html
# https://lucene.apache.org/solr/guide/8_4/the-standard-query-parser.html
# http://yonik.com/solr/query-syntax/


# we need to perform query expansion at some point

# this is the main function



import re
from nltk.corpus import stopwords
from nltk.stem import PorterStemmer
import json


def load_stopwords():
    stopword=set()
    with open('./stopwords.txt') as f:
      for word in f.readlines():
          word=word.strip('\n')
          stopword.add(word)
    return stopword



def solr_query_builder(info_focus_dict):
    
    porter = PorterStemmer()
    query_parts = []
    key_terms=[]
    pattern = re.compile(r'(?:\d|[a-zA-Z])\.\s([a-zA-Z].*)')
    query_dic={}
    for concept in info_focus_dict['event']:
        term = concept['name']
        weight = format(float(concept['importance']), '.2f')
        match=pattern.search(term)  
        if match:
            term=match.group(1)
        parts=term.split(",")
        for part in parts:
            minimals=part.split(" ")
            for minimal in minimals:
                add_to_query_dic(query_dic,minimal,weight,stopwords)
                   
    for key, value in query_dic.items():
        query_parts.append('abstract:'+key+ '^' + str(value))
        query_parts.append('title:' + key+ '^' + str(value))
        key_terms.append(key)
 
    query_string = ' '.join(query_parts)
    free_text_query = ' '.join(key_terms)

    return query_string,free_text_query


def add_to_query_dic( query_dic,term,weight,stopwords):
    term=term.lower().strip("[]()-")
    if term !="" and term not in stopwords.words('english'):  
        if term not in query_dic:
            query_dic[term]=weight
        else:
            query_dic[term]=query_dic[term]+weight
# Unit test
if __name__ == '__main__':
    info_focus_dict = {
        "event": [
            {
                "name": "back",
                "importance": 5
            },
            {
                "name": "pain",
                "importance": 10
            }
        ]
    }
    
    query_string = solr_query_builder(info_focus_dict)
    print(query_string)