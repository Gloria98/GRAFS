import sys
import xml.etree.ElementTree as ET
import json

if len(sys.argv) != 3:
    exit ('Params: xml_path output_path')

xml_path = sys.argv[1]
output_path = sys.argv[2]

tree = ET.parse(xml_path)
root = tree.getroot()

def get_abstract_text(PMID, Article):
    if Article.find('Abstract') is None:
        return 'ABSTRACT_NOT_AVAILABLE'

    ArticleAbstract = ''
    for AbstractText in Article.find('Abstract'):
        Label = AbstractText.get('Label')
        if AbstractText.text is None:
            continue
        if Label is not None:
            ArticleAbstract += Label + ': ' + ''.join(AbstractText.itertext()) + ' \n'
        else:
            ArticleAbstract +=                ''.join(AbstractText.itertext()) + ' \n'
    return ArticleAbstract.strip()

def get_date(PMID, PubmedData):
    if PubmedData.find('History') is None:
        return '0000-00-00T00:00:00Z'
    for PubDate in PubmedData.find('History'):
        if PubDate.get('PubStatus') == 'entrez':
            year = PubDate.find('Year').text
            month = PubDate.find('Month').text
            day = PubDate.find('Day').text
            return '{:04d}-{:02d}-{:02d}T00:00:00Z'.format(int(year), int(month), int(day))
    return '0000-00-00T00:00:00Z'

def get_headings(PMID, HeadingList):
    if HeadingList is None:
        return []
    headings = []
    for heading in HeadingList:
        h = []
        for term in heading:
            if term.tag == 'DescriptorName':
                h.append( ('D', term.get('MajorTopicYN'), term.get('UI'), term.text ) )
            elif term.tag == 'QualifierName':
                h.append( ('Q', term.get('MajorTopicYN'), term.get('UI'), term.text ) )
        headings.append(h)
    return headings

def flatten_headings(headings):
    heading_terms = set([])
    heading_ids = set([])
    for heading in headings:
        for DescriptorQualifier, MajorTopicYN, UI, term in heading:
            if term not in heading_terms: 
                heading_terms.add(term)
            if UI not in heading_ids:
                heading_ids.add(UI)
    return list(heading_terms), list(heading_ids)

def get_keywords(PMID, KeywordList):
    if KeywordList is None:
        return []
    keywords = []
    for kwd in KeywordList:
        keywords.append(kwd.text)
    return keywords

out_f = open(output_path, 'w')
# sys.stdout.write('[')

# i = 0
for PubmedArticle in root:
    MedlineCitation = PubmedArticle.find('MedlineCitation')
    
    PMID_ = MedlineCitation.find('PMID')

    if PMID_.get('Version') != '1': # duplicates, only index the first version
        continue

    PMID = PMID_.text

    Article = MedlineCitation.find('Article')

    Title = ''.join(Article.find('ArticleTitle').itertext()).strip()    

    Abstract = get_abstract_text(PMID, Article)

    # Journal Information
    MedlineJournalInfo = MedlineCitation.find('MedlineJournalInfo')
    JournalName = MedlineJournalInfo.find('MedlineTA').text
    JournalNlmId = MedlineJournalInfo.find('NlmUniqueID').text

    PubmedData = PubmedArticle.find('PubmedData')
    # Journal Pub Time
    Date = get_date(PMID, PubmedArticle.find('PubmedData'))

    Headings = get_headings(PMID, MedlineCitation.find('MeshHeadingList'))
    heading_terms, heading_ids = flatten_headings(Headings)

    Keywords = get_keywords(PMID, MedlineCitation.find('KeywordList'))
    

    doc = {}
    doc['pmid'] = PMID
    doc['title'] = Title
    doc['abstract'] = Abstract
    doc['journal'] = JournalName
    doc['journal_id'] = JournalNlmId
    doc['date'] = Date
    # doc['heading_all'] = Headings # can leave it to lookup tables
    doc['heading_term'] = heading_terms
    doc['heading_id'] = heading_ids
    doc['keyword'] = Keywords
    
    json_string = json.dumps(doc)

    # if i > 0:
        # sys.stdout.write(',')
    out_f.write(json_string + '\n')


    # print (u'{}\n{}\n{}\n{}\n{}\n{}\n{}\n{}\n\n'.format(PMID, Title, Abstract, JournalName, JournalNlmId, Date, Headings, Keywords))

    # i += 1

# sys.stdout.write(']')
out_f.close()

print(output_path)