# This module takes the query string from query_builder, include it into
# one or multiple URLs, and submit the search request to Solr

import requests
import json
import unicodedata

SOLR_URL_PREFIX_LOCAL = 'http://localhost:8983/solr/PubMedDemo/select'
SOLR_URL_PREFIX_SERVER = 'http://10.4.80.108:8984/solr/MEDLINEv2107/select'

# this is a simple searcher just only returns the first 100 results
def solr_document_searcher(query_string, local, num_docs):
    if local:
        SOLR_URL_PREFIX = SOLR_URL_PREFIX_LOCAL
    else:
        SOLR_URL_PREFIX = SOLR_URL_PREFIX_SERVER

    payload = {'q': query_string, 'start': '0', 'rows': num_docs,"facet.field":"snomed_codes","facet":"off"}
    r = requests.get(SOLR_URL_PREFIX, params=payload)
    search_result = r.json()

    if 'response' not in search_result:
        print(search_result)
        
    else:
    # preprocess certain non-ascii strings
        response = search_result['response']
        for i in range(len(response['docs'])):
            if 'abstract' in response['docs'][i]:
                abstract = response['docs'][i]['abstract'][0]
            else:
                abstract = 'ABSTRACT_NOT_AVAILABLE'
            response['docs'][i]['abstract'] = [unicodedata.normalize("NFD", abstract)]

            title = response['docs'][i]['title'][0]
            response['docs'][i]['title'][0] = unicodedata.normalize("NFD", title)

    return search_result


# Unit test
if __name__ == '__main__':
    query_string = 'abstract:headache OR title:headache'

    results = solr_document_searcher(query_string, False)
    clusters = results['clusters']
    for c in clusters:
        print(c['labels'], len(c['docs']))
    # print (json.dumps(results))