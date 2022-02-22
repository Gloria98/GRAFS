import sys

if len(sys.argv) != 3:
    exit('Params: MRCONSO_path SNOMED_map_path')

MRCONSO_path = sys.argv[1]
MEDDRA_map_path = sys.argv[2]

umls_f = open(MRCONSO_path, encoding = 'utf8')
out_f = open(MEDDRA_map_path, 'w', encoding = 'utf8')

# https://www.ncbi.nlm.nih.gov/books/NBK9685/table/ch03.T.concept_names_and_sources_file_mr/?report=objectonly
# C0000727|CZE|S|L8021275|PF|S10071957|N|A26267318|||10000647|MDRCZE|LLT|10000647|Akutní břicho|3|N||
# 1 CUI: C0000727
# 2 LAT: CZE
# 3 TS: S
# 4 LUI: L8021275
# 5 STT: PF
# 6 SUI: S10071957
# 7 ISPREF: N
# 8 AUI: A26267318
# 9 SAUI: ''
# 10 SCUI: ''
# 11 SDUI: 10000647
# 12 SAB: MDRCZE
# 13 TTY: LLT
# 14 CODE: 10000647
# 15 STR: Akutní břicho
# 16 SRL: 3
# 17 SUPPRESS: N
# 18 CVF: ''

out_f.write('\t'.join(['CUI', 'AUI', 'Source', 'TermType', 'SourceId', 'UMLSString']) + '\n')

i = 0
MDR_cnt = 0
for line in umls_f:
    ss = line.strip().split('|')
    if len(ss) != 19:
        print ('Line {} does not have 19 columns: {}'.format(i, ss))
        continue
    CUI, LAT, TS, LUI, STT, SUI, ISPREF, AUI, SAUI, SCUI, SDUI, SAB, TTY, CODE, STR, SRL, SUPPRESS, CVF = ss[:-1]

    if SAB == 'SNOMEDCT_US':
        out_f.write('\t'.join([CUI, AUI, SAB, TTY, CODE, STR ]) + '\n')

        MDR_cnt += 1
    i += 1

print ('total number of lines: ', i)
print ('total number of SNOMEDCT_US:', MDR_cnt)

umls_f.close()
out_f.close()