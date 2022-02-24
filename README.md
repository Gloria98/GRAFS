# GRAFS (Graphical Faceted Search Interface)

## Overview
GRAFS needs three components to run, a solr search engine, a front-end, and a back-end. TODO: include a graph to show the connection btw them

![grafs_structure2](https://user-images.githubusercontent.com/38746205/155271227-0eb6f7c8-5594-43f3-b49b-e90ce18bc053.png)


## Step 1: Download this repo or clone it using
```
$ git clone https://github.com/Gloria98/GRAFS.git
$ cd GRAFS
```


## Step 2: Solr Search Engine Setup
For the purpose of demo, we provided a small set of processed document in `.jsonl` format. You can find it [here](/data/output/pubmed22n1114_extracted_snomed_terms.jsonl). Each line in this file contains one pubmed article, with its title, abstract, and other extracted information. You can find more details of the extact format and preprocessing methods in the later section.

To setup Solr search engine, you can directly run:
```
$ ./data/src/solr_setting.sh
```
The script will download the Solr software, setup the schema, run the search engine on `localhost:8983`, create a core called `PubMedDemo`, and index the preprocessed data. You can access the search engine in [`http://localhost:8983/solr`](http://localhost:8983/solr).

## Step 3: Back-end Setup
The back-end of GRAFS is a Flask API. We will setup a Python 3 environment to run the API on localhost. You can install all the required packages by running:

```
$ pip install -r requirements.txt
```
Then run the following command:
```
$ python back_end/start_api.py
```
The back-end API will run on `localhost:8985`

## Step 4: Open the Front-end in your browser
Now you can directly open `front_end/index.html` in your browser. Happy searching!

## Data preprocessing
In this section, we provide detailed instruction from downloading the original PubMed data to preprocessing the data into ready-to-index format. This section is not required for the demo.

### PubMed XML File
You can access PubMed data from this [page](https://www.nlm.nih.gov/databases/download/pubmed_medline.html).

This [FTP folder](https://ftp.ncbi.nlm.nih.gov/pubmed/baseline/) is publicly accessible. It contains ALL PubMed abstracts. We take the [last file](https://ftp.ncbi.nlm.nih.gov/pubmed/baseline/pubmed22n1114.xml.gz) as an example. It contains the latest articles published. Download [last file](https://ftp.ncbi.nlm.nih.gov/pubmed/baseline/pubmed22n1114.xml.gz) and extract the `.xml` file to the folder `./data/input/`.

### UMLS Metathesaurus
We will recognize all the SNOMED concepts from the downloaded PubMed articles. To prepare the SNOMED vocabulary, please download the UMLS Metathesaurus file on this [page](https://www.nlm.nih.gov/research/umls/licensedcontent/umlsknowledgesources.html). Note that you will need to register for UMLS Terminology Services. We will need the following two files in the `META/` folder:

Concept semantic type table: `/META/MRSTY.RRF`

Concept string table: `/META/MRCONSO.RRF`

Download the two required files and put them to the folder `./data/input/`.

### Software Requirements
1. Python 3
2. NLTK
   After installing the NLTK package, run the following command:
   ```
   >>> import nltk
   >>> nltk.download('punkt')
   ```
3. Concept recognition tool
   Download [maximal pattern matching tool](https://github.com/jake612/UMLS_Trie) and use it as a local package. You can copy the repo to the folder `./data/`.
   
Now your folder structure should look similar to this
```
GRAFS/
    data/
        UMLS_Trie/
        src/
        output/
        input/
            stopword_list.txt
            pubmed22n1114.xml
            MRSTY.RRF
            MRCONSO.RRF
            ctakes_semantic_types.json
```
Then process the downloaded data by running
```
$ ./data/src/preprocessing.sh
```
The final output file is `pubmed22n1114_extracted_snomed_terms.jsonl`. Each line of the file is a document's information in the format of `.json`. This file can then be directly indexed by solr (following [Step 2](https://github.com/Gloria98/GRAFS/edit/main/README.md#step-2-solr-search-engine-setup)). An example of a line.

```
{
  "pmid": "34878743",
  "title": "[COVID-19, anticoagulation and venous thromboembolism: what have we learned ?]", 
  "abstract": "Severe COVID-19 is associated with venous thromboembolic events and and immuno-thrombotic phenomena...",
  "journal": "Rev Med Suisse", 
  "journal_id": "101219148", "date": "2021-12-08T00:00:00Z", 
  "heading_term": [], 
  "heading_id": [], 
  "keyword": [], 
  "abstract_sen": "[0, 17, 53, 76, 104]", 
  "abstract_snomed_ents": "[[0, 0, \"C0205082;T033;24484000\", \"Severe\"], [1, 1, \"C5203670;T047;840539006\", \"COVID-19\"] ...]",
  "title_snomed_ents": "[[4, 4, \"C0040038;T046;13713005,371039008\", \"thromboembolism:\"]]",
  "snomed_codes": ["13713005", "24484000", "738985004", "25607008", "367391008", "37782003" ...]
}
```
