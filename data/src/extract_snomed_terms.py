import json
import sys
sys.path.append('../UMLS_Trie')
from UMLS_Trie import trie
from nltk.tokenize import sent_tokenize

if len(sys.argv) != 5:
    exit('Params: snomed_str2code stop_list index_jsonl_file snomed_terms_jsonl_file')


snomed_str2code_file = sys.argv[1]
stop_list_file = sys.argv[2]
index_jsonl_file = sys.argv[3]
snomed_terms_jsonl_file = sys.argv[4]

print(index_jsonl_file)

def get_s2c_trie(snomed_str2code_file, stop_terms):

    str2code = {}
    with open(snomed_str2code_file, encoding='utf8') as f:
        for line in f:
            s, c = line.strip().split('\t')
            s_lower = s.lower()
            if s_lower not in stop_terms:
                if s_lower not in str2code:
                    str2code[s_lower] = c

    my_trie = trie()
    for s, c in str2code.items():
        my_trie.insert_string(s, " ", c)

    return my_trie

def convert_to_char_offsets(text, codes, delimiter):
    tokens = text.split(delimiter)
    len_delimiter = len(delimiter)
    char_map = []
    i = 0
    for token in tokens:
        char_map.append( (i, i + len(token)) )
        i += len(token) + len_delimiter
    
    res = []
    for token_i, token_j, c, t in codes:
        char_i = char_map[token_i][0]
        char_j = char_map[token_j][1] - 1
        res.append( (char_i, char_j, c, t) )
        assert text[char_i:char_j+1] == delimiter.join(tokens[token_i:token_j+1])
    return res

def get_stop_terms(stop_list_file):
    stop_terms = set()
    with open(stop_list_file, encoding='utf8') as f:
        for line in f:
            stop_terms.add( line.strip().lower() )
    return stop_terms

def get_sent_boundary(s):
    start = 0
    boundary_array = [0]
    for sent in sent_tokenize(s):
        sent_tokens = sent.split(" ")
        start += len(sent_tokens)
        boundary_array.append(start)
    return boundary_array

stop_terms = get_stop_terms(stop_list_file)
s2c_trie = get_s2c_trie(snomed_str2code_file, stop_terms)

def extract_codes(s):
    original_tokens = s.split(" ")
    
    # processed tokens: remove surrounding punctuations
    s_tokens = []
    for tok in original_tokens:
        s_tok = tok.strip('.').strip(',').strip(';').strip(':').strip('"').strip("'").strip("(").strip(")")
        s_tokens.append(s_tok)

    token_codes = s2c_trie.get_codes(" ".join(s_tokens).lower(), " ")
    token_codes = [list(e) for e in token_codes]

    for i in range(len(token_codes)):
        start = token_codes[i][0]
        end = token_codes[i][1]
        token_codes[i][3] = " ".join(original_tokens[start:end+1])
    # char_codes  = convert_to_char_offsets(abstract, token_codes, " ")
    return token_codes

def get_ctakes_codes(abstract_ents, title_ents):
    codes = set()
    for ent in abstract_ents + title_ents:
        for cui in ent[2].split('.'):
            code_str = cui.split(';')[2]
            for c in code_str.split(','):
                codes.add(c)
    return list(codes)

out_f = open(snomed_terms_jsonl_file, 'w', encoding='utf8')

# i = 0
with open(index_jsonl_file, encoding='utf8') as f:
    for line in f:
        obj = json.loads(line.strip())

        abstract_ents = extract_codes(obj['abstract'])
        title_ents = extract_codes(obj['title'])
        abstract_sent_boundary = get_sent_boundary(obj['abstract'])

        obj['abstract_sen'] = json.dumps(abstract_sent_boundary)
        obj['abstract_snomed_ents'] = json.dumps(abstract_ents)
        obj['title_snomed_ents'] = json.dumps(title_ents)
        obj['snomed_codes'] = get_ctakes_codes(abstract_ents, title_ents)

        out_f.write(json.dumps(obj) + '\n')

        # if i % 1000 == 0:
            # sys.stdout.write('{}\r'.format(i))
        # i += 1
out_f.close()
# print (i)