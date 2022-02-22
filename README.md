# GRAFS (Graphical Faceted Search Interface)

## Overview
GRAFS needs three components to run, a solr search engine, a front-end, and a back-end. TODO: include a graph to show the connection btw them

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
In this section, we provide detailed instruction from downloading the original PubMed data and resources to preprocessing the data into ready-to-index format.
