"use strict";
define([
    "dojo",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/on",
    "dojo/dom",
    "dojo/dom-style",
    "dojo/request/xhr",
    "dojo/json",
    "dojo/dom-construct",
    "dojo/parser",
    "dojo/query",
    "dijit",
    "dijit/form/DropDownButton",
    "dijit/TooltipDialog",
    "dijit/CheckedMenuItem",
    "dijit/form/CheckBox",
    "dijit/_WidgetBase",
    "dijit/_Container",
    "dijit/registry",
    "cadence/vis/components/ClusterView",
    "cadence/vis/components/KeywordsView",
    "cadence/vis/components/ClusterTreemap",
    "cadence/vis/components/ClusterViewBaseline",
], (dojo, declare, lang, dojoOn, dom, domStyle, xhr, json, domConstruct, parser, query, dijit, DropDownButton,
    TooltipDialog, CheckedMenuItem, CheckBox, _WidgetBase, _Container, registry, ClusterView, KeywordsView, ClusterTreemap, ClusterViewBaseline) => {
    return class {
        constructor(dom_container_id) {
            this.initiated = false;
            this.dispatch = d3.dispatch("update", "ranklistUpdate", "keywordUpdate", "highlightUpdate", "updateSelected", "deleteCluster");

            // Add the visual elements for this visualization.
            this.container_id = dom_container_id;
            this.list_container_id = dom_container_id + "_list";
            this.page_container_id = dom_container_id + "_page";
            this.keyword_container_id = dom_container_id + "_keyword";
            this.cluster_view_id = dom_container_id + "_cluster";
            this.treemap_container_id = dom_container_id + "_treemap";
            this.summary_container_id = dom_container_id + "_summary";
            this.adv_query_id = dom_container_id + "_adv_query";
            let container = dom.byId(dom_container_id);
            this.total_page;
            this.page;
            this.previous;
            this.next;
            this.page_range;
            this.clustering_algorithm = "Lingo";
            this.num_clusters = 20;
            this.num_docs = 1000;
            this.arc_threshold = [0, 0];
            this.concept_list = {};
            this.keyword_view_list = {};
            this.current_page_docs = [];
            this.arc_opacity = [1.0, 0.4];
            this.snomed_cluster = 0;
            this.v_baseline = false;
            this.action_records = [{"type": "begin"}];
            this.user_id = Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
            this.advanced_queries = [
                {"title": "Vitamin supplementation in pregnancy",
                "query": '((abstract:pregnan* AND (abstract:vitam* OR abstract:tocopherol* OR abstract:alpha‐tocopherol*)) ' +
                    'AND (abstract:random* OR abstract:controlled‐clinical‐trial)) OR ((title:pregnan* AND (title:vitam* ' +
                    'OR title:tocopherol* OR title:alpha‐tocopherol*)) AND (title:random* OR title:controlled‐clinical‐trial))',
                "free_text": "pregnan* vitam* tocopherol* alpha‐tocopherol* random* controlled‐clinical‐trial",
                "Question": "Find out what kind of intervention are used during clinical trials to study the effects of vitamin C."},
                {
                    "title": "COVID-19 Diagnosis",
                    "query": '((abstract:"COVID-19" OR abstract:"COVID-19 Vaccines" OR abstract:"COVID-19 serotherapy" ' +
                        'OR abstract:"COVID-19 Nucleic Acid Testing" OR abstract:"COVID-19 Serological Testing" ' +
                        'OR abstract:"COVID-19 Testing" OR abstract:"SARS-CoV-2" OR abstract:"Severe Acute Respiratory Syndrome Coronavirus 2" ' +
                        'OR abstract:"NCOV" OR abstract:"2019 NCOV" OR ((abstract:"coronavirus" OR abstract:"COV") ' +
                        'AND date:[2019-11-01T00:00:00Z TO 3000-01-01T00:00:00Z])) AND (abstract:"diagnos*" OR abstract:"detect*")) ' +
                        'OR ((title:"COVID-19" OR title:"COVID-19 Vaccines" OR title:"COVID-19 serotherapy" OR title:"COVID-19 Nucleic Acid Testing" ' +
                        'OR title:"COVID-19 Serological Testing" OR title:"COVID-19 Testing" OR title:"SARS-CoV-2" ' +
                        'OR title:"Severe Acute Respiratory Syndrome Coronavirus 2" OR title:"NCOV" OR title:"2019 NCOV" ' +
                        'OR ((title:"coronavirus" OR title:"COV") AND date:[2019-11-01T00:00:00Z TO 3000-01-01T00:00:00Z])) ' +
                        'AND (title:"diagnos*" OR title:"detect*"))',
                    "free_text": "COVID-19 COVID-19 Vaccines COVID-19 serotherapy COVID-19 Nucleic Acid Testing COVID-19 Serological Testing" +
                        "COVID-19 Testing 2019 NCOV coronavirus COV diagnos detect"
                },
                {
                    "title": 'Treatments for Depression',
                    "query": '(heading_term:“Depression” OR heading_term:“Depressive Disorder”) AND ((heading_term:"clinical trials as topic" ' +
                        'OR abstract:"clinical trials" OR title:"clinical trials") OR (heading_term:"clinical trials as topic" OR abstract:"clinical trial" ' +
                        'OR title:"clinical trial") OR (heading_term:"randomized controlled trials as topic" OR abstract:"randomized controlled trial" ' +
                        'OR abstract:"randomised controlled trial" OR title:"randomized controlled trial" OR title:"randomised controlled trial") ' +
                        'OR (heading_term:"randomized controlled trials as topic" OR abstract:"randomized controlled trials" ' +
                        'OR abstract:"randomised controlled trials" OR title:"randomized controlled trials" OR title:"randomised controlled trials") ' +
                        'OR abstract:"randomly" OR abstract:"trial" OR abstract:"groups" OR abstract:"placebo*" OR (abstract:"control*" ' +
                        'AND (abstract:"trial*" OR abstract:"study" OR abstract:"studies")) OR (title:"control*" AND (title:"trial*" OR title:"study" OR title:"studies")))',
                    "free_text": "depression Depressive Disorder"
                },
            ]

            // this.color_theme_list = ["LightSkyBlue", "LightGreen", "LightSalmon", "BlueViolet", "Aquamarine", "RosyBrown",
            //     "SandyBrown", "Plum", "CornflowerBlue", "Olive", "Brown", "CadetBlue",
            //     "BurlyWood", "Chartreuse", "Crimson", "Cyan", "DarkBlue","DarkCyan",
            //     "DarkGoldenRod", "DarkGreen", "DarkMagenta", "DarkOrange", "DarkRed", "DarkSeaGreen",
            //     "DarkSlateBlue", "FireBrick", "GoldenRod", "Khaki","LightGrey"];
            this.color_theme_list = ['#a6cee3','#1f78b4','#b2df8a','#33a02c','#fb9a99','#e31a1c','#fdbf6f','#ff7f00','#cab2d6','#b667b8','#b15928','#BDB76B',
                '#a6cee3','#1f78b4','#b2df8a','#33a02c','#fb9a99','#e31a1c','#fdbf6f','#ff7f00','#cab2d6','#bc80bd','#b15928'];
            //this.host = "10.4.80.108";
            this.host = "0.0.0.0"
            container.innerHTML =
                "<div style='height: 100%; margin-left: 5px; display: flex; flex-direction: column'>" +
                "<div>"+
                "<input type='text' id='query' style='width: 50em;' data-dojo-type='dijit/form/TextBox'> " +
                "<button id='search_submit' data-dojo-type='dijit/form/Button' style='background-color: #0d8cf1' type='button'>Submit!</button>" +
                "<button id='hide_optional' data-dojo-type='dijit/form/Button' style='background-color: #0d8cf1' type='button'>Hide Options</button>" +
                "<div class='optional'>" +
                "<div><label class='switch'><input type='checkbox' checked><span class='slider round'></span></label></div>"+
                // "<div id='algorithm'>Algorithm: </div>"+
                "<div><label>User ID: <input type='text' id='user_id' value=0></label>" +
                "<button id='start_end' style='background-color: #DC143C;'>Start!</button></div>" +
                "<div><label>Number of Concepts: <input type='text' id='num_clusters' value=20></label></div>"+
                "<div><label>Number of Documents: <input type='text' id='num_docs' value=1000></label></div>"+
                // "<div id='cluster_concept_type'>" +
                // "<p>Organize using:</p>" +
                // "<input type='radio' id='snomed' name='concept_type' value='snomed' checked> <label for='snomed'>SNOMED</label><br>"+
                // "<input type='radio' id='autophrase' name='concept_type' value='autophrase'> <label for='autophrase'>AutoPhrase</label><br>"+
                // "<input type='radio' id='ap_lingo' name='concept_type' value='ap_lingo'> <label for='ap_lingo'>AP_Lingo</label><br>"+
                // "</div>"+
                "<div id='" + this.adv_query_id + "' style='margin: 10px;'><h3>Advanced Queries</h3></div>" +
                "</div></div>"+
                "<div style='display: table; background-color: #F8F9FA; border: 1px solid; border-color: #DCDDDE; padding: 10px'>" +
                "<div id = 'column_container' style='background-color: #F8F9FA; float: left; width: 30%; padding: 10px;' data-dojo-type='dijit/layout/ContentPane'>" +
                "<p></p>" +
                "<div id='excluded_clusters'></div>"+
                "<div id ='" + this.cluster_view_id + "'></div>" +
                "</div>" +
                "<div id = 'right_column' style='float: left; width: 70%; border-radius: 5px; padding: 10px'>" +
                // "<div style='flex: 70%; float: left;padding: 10px;'>" +
                // "<div id='" + this.treemap_container_id + "'></div>" +
                "<div style='display: table; margin-top: 20px;'>" +
                "<div style='width: 80%; float: left;padding: 10px;'>" +
                "<div id='" + this.treemap_container_id + "'></div>" +
                "<div id='" + this.list_container_id + "'><p>Click an advanced query or type a query in the search bar.</p></div>" +
                "<div id='" + this.page_container_id + "'></div>" +
                "</div>" +
                "<div style='width: 20%; float: left;padding: 10px;'>" +
                "<div id = '" + this.summary_container_id + "'> </div>"+
                "<div id = '" + this.keyword_container_id + "'> </div>" +
                "</div>"+
                "</div>"+

                "</div>" +
                "</div>" +
                "</div>";

        }

        on(event_name, event_handler) {
            this.dispatch.on(event_name, event_handler);
        }

        get_time_string(){
            var today = new Date();
            var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
            var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
            var dateTime = date+' '+time;
            return dateTime
        }

        // This is for steps that have to be done after the initial construction, such as the first resize.  Note that
        // this resize should trigger a render automatically.
        init(baseline) {
            console.log(baseline);
            let abstract = this;
            abstract.v_baseline = baseline;
            if (baseline===true) d3.select("#" + this.container_id).select(".switch").select("input").property("checked", false);
            console.log("begining ---------");

            // Add search button listener
            let search_button = dom.byId("search_submit");
            search_button.addEventListener("click", function(){
                abstract.num_docs = d3.select("#" + abstract.container_id).select("#num_docs").property("value");
                var query_box = registry.byId("query");
                var query_text = query_box.get("value");

                let data_obj = {
                    'num_clusters': abstract.num_clusters,
                    'clustering_algorithm': abstract.clustering_algorithm,
                    'num_docs': abstract.num_docs,
                    'advanced': true,
                    'advanced_query': query_text,
                    'free_text_query': abstract.current_query['free_text'],
                    'snomed': abstract.snomed_cluster,
                    "v_baseline": abstract.v_baseline
                };
                console.log("query", query_text);
                abstract.free_text_query = data_obj['free_text_query'];
                // console.log(abstract.num_docs, abstract.num_clusters);
                var postArgs = {

                    data: json.stringify(data_obj),
                    handleAs: "json",
                    headers: {
                        "credentials": 'include',
                        "Content-Type": "application/json"
                    },
                    method: "post",
                    withCredentials: true
                };
                var error_num=0;
                d3.select("#" + abstract.container_id).select(".optional").style("display", 'none');
                d3.select("#" + abstract.container_id).select("#hide_optional").text("Expand Options");
                abstract.get_data(postArgs,error_num);
            });

            // add advanced queries
            d3.select("#" + abstract.adv_query_id)
                .selectAll("my_query")
                .data(abstract.advanced_queries)
                .enter()
                .append("div")
                .classed("adv_query_entry", true)
                .html(function(d, i) {
                    let text = d.title;
                    return "<label style='font-size: 15px'>"+text+"</label> " +
                        "<button class='query_button' data-dojo-type='dijit/form/Button' style='background-color: #0d8cf1' type='button'>Submit!</button>"
                });
            // search through clicking advanced queries
            d3.select("#" + abstract.adv_query_id)
                .selectAll(".query_button")
                .on("click", function(d, i) {
                    d3.select("#" + abstract.container_id).select("#query").property("value", abstract.advanced_queries[i]['query']);
                    abstract.current_query = abstract.advanced_queries[i];
                    abstract.num_docs = d3.select("#" + abstract.container_id).select("#num_docs").property("value");
                    let data_obj = {
                        'num_clusters': abstract.num_clusters,
                        'clustering_algorithm': abstract.clustering_algorithm,
                        'num_docs': abstract.num_docs,
                        'advanced': true,
                        'advanced_query': abstract.advanced_queries[i]['query'],
                        'free_text_query': abstract.advanced_queries[i]['free_text'],
                        'snomed': abstract.snomed_cluster,
                        "v_baseline": abstract.v_baseline
                    };
                    abstract.free_text_query = data_obj['free_text_query'];
                    var postArgs = {

                        data: json.stringify(data_obj),
                        handleAs: "json",
                        headers: {
                            "credentials": 'include',
                            "Content-Type": "application/json"
                        },
                        method: "post",
                        withCredentials: true
                    };
                    var error_num=0;
                    d3.select("#" + abstract.container_id).select(".optional").style("display", 'none');
                    d3.select("#" + abstract.container_id).select("#hide_optional").text("Expand Options");
                    abstract.get_data(postArgs,error_num);
                })

            // number of document input
            d3.select("#" + this.container_id).select("#num_docs")
                .on("change", function(_d) {
                    abstract.num_docs = d3.select(this).property("value");
                    console.log(abstract.num_docs);
                });
            // number of cluster input
            d3.select("#" + this.container_id).select("#num_clusters")
                .on("change", function(_d) {
                    abstract.num_clusters = d3.select(this).property("value");
                    // console.log(abstract.num_clusters);
                });
            //start or end of study
            d3.select("#" + this.container_id)
                .select("#start_end")
                .on("click", function(d, i) {
                    if (d3.select(this).text()!='End') {
                        let system = "_1";
                        if (abstract.v_baseline) system = "_0";
                        let user_id_number = d3.select("#" + abstract.container_id).select("#user_id").property("value");
                        abstract.user_id = "user_" + user_id_number + system;
                        d3.select(this).text("End");
                    }
                    else {
                        abstract.user_id += "end";
                        d3.select(this).text("Start!");
                    }
                })

            // context menu, the menu shown after right clicking
            this.context_menu = d3.select("#" + this.container_id)
                .append("div")
                .attr('id', 'context-menu')
                .html('<div class="item">Search on Google</div>');
            if (!this.v_baseline) {
                this.context_menu.append("div").classed("item", true).text("Add to concept list");
            }
            d3.select("#" + this.container_id).on('click', (e) => {
                d3.select("#" + this.container_id).selectAll("#context-menu")
                    .classed('visible', false);
            });

            // add the rendering sign
            this.rendering_sign = d3.select("#" + this.container_id)
                .append("div")
                .attr('id', 'rendering')
                .html("<img src='img/hourglass_spinner.svg'>");
                // .style('display', "none")
                // .attr('height', '30').attr('width', '30');

            // advanced version or baseline version
            d3.select("#" + this.container_id)
                .select(".switch")
                .on("change", function(d) {
                    if (d3.select(this).select("input").property("checked")) {
                        abstract.v_baseline = false;
                        abstract.context_menu.append("div").classed("item", true).text("Add to concept list");
                    }
                    else {
                        abstract.v_baseline = true;
                        abstract.context_menu.html('<div class="item">Search on Google</div>');
                    }
                })

            // additional settings
            d3.select("#" + this.container_id)
                .select("#hide_optional")
                .on("click", function () {
                    if (d3.select("#" + abstract.container_id).select(".optional").style("display")==='block') {
                        d3.select("#" + abstract.container_id).select(".optional").style("display", 'none');
                        d3.select(this).text("Expand Options");
                    }
                    else{
                        d3.select("#" + abstract.container_id).select(".optional").style("display", 'block');
                        d3.select(this).text("Hide Options");
                    }
                })
        }

        // Update with new data
        update(update_data) {
            console.log("update_data");

            //dijit.byId( 'filter_by_concepts' ).destroy( true );

            let abstract = this;
            if (this.initiated == true) {

                dom.byId(this.list_container_id).innerHTML = "<img src='img/hourglass_spinner.svg'>";
                dom.byId(this.page_container_id).innerHTML = "";
                registry.byId( 'filters_container' ).domNode.style.display='none';
                console.log("finish destroy");
                this.data = update_data;

                var data_obj = {"event": []};
                var concepts = this.data;
                var importance;
                var name;
                for (var k in concepts) {
                    if (concepts[k]['concept']['type'] == undefined) {
                        importance = concepts[k]['importance'];
                        name = concepts[k]['concept']['label'];

                    } else {
                        importance = concepts[k]['importance'];
                        name = concepts[k]['concept']['type']['label'];
                    }
                    var event = {
                        "name": name,
                        "importance": importance
                    };
                    data_obj['event'].push(event);
                }

                data_obj['num_clusters'] = abstract.num_clusters;
                data_obj['clustering_algorithm'] = abstract.clustering_algorithm;
                data_obj['num_docs'] = abstract.num_docs;
                data_obj['advanced'] = false;
                data_obj['snomed'] = abstract.snomed_cluster;
                var postArgs = {
                    data: json.stringify(data_obj),
                    handleAs: "json",
                    headers: {
                        "credentials": 'include',
                        "Content-Type": "application/json"
                    },
                    method: "post",
                    withCredentials: true
                };

                var error_num=0;
                abstract.get_data(postArgs,error_num);

            }

        }

        // The render function, which should update all elements of this visualization.
        render(data) {

            // Update the visualizations
            this.selected_clusters = [];
            this.concept_list = {};
            let action_args = {"type": "newClusters", "clusters": data['clusters'],
                "idx_to_groups": data['idx_to_groups'], "v_baseline": this.v_baseline};
            this.update_actions(action_args);
            // not used in current version
            this.keyword_view = new KeywordsView(this.keyword_container_id);
            this.keyword_view.on("updateActions", lang.hitch(this, this.update_actions));
            // rerender, so remove previous version
            d3.select("#" + this.treemap_container_id).selectAll("*").remove();
            d3.select("#" + abstract.summary_container_id).selectAll("div").remove();
            // d3.select("#" + this.cluster_view_id).selectAll("*").remove();
            // let type = typeof this.cluster_view;
            // console.log("cluster view type", type);
            // if (typeof this.cluster_view === 'object') delete this.cluster_view;
            // console.log("cluster view type", type);
            if (this.v_baseline) {
                this.cluster_view = new ClusterViewBaseline(this.cluster_view_id);
            }
            else {
                this.cluster_view = new ClusterView(this.cluster_view_id);
                this.treemap_view = new ClusterTreemap(this.treemap_container_id);
            }

            // keep page information
            abstract.total_page = Math.min(Math.floor(data['solr_results']['response']['docs'].length / 10-0.1) + 1, 10);
            abstract.page = 1;
            abstract.page_range = abstract.create_page_range(abstract.total_page);
            this.update_page(data);

            // manage interactions between different components
            if (this.v_baseline) {
                console.log("running baseline version");
                this.cluster_view.init(data);
                this.cluster_view.on("ranklistUpdate", lang.hitch(this, this.ranklistUpdate_handler));
                this.cluster_view.on("keywordUpdate", lang.hitch(this, this.keyword_recommend));
                this.cluster_view.on("updateActions", lang.hitch(this, this.update_actions));
            }
            else {
                console.log("running non-baseline version");
                this.treemap_view.init(data['d3_json'], data['clusters']);
                this.cluster_view.init(data, this.treemap_view);
                this.cluster_view.on("ranklistUpdate", lang.hitch(this, this.ranklistUpdate_handler));
                this.cluster_view.on("keywordUpdate", lang.hitch(this, this.keyword_recommend));
                // this.cluster_view.on("keywordUpdate", lang.hitch(this, this.cluster_summary));
                this.cluster_view.on("updateSelected", lang.hitch(this, this.update_treemap));
                this.cluster_view.on("deleteCluster", lang.hitch(this, this.recal_cluster));
                this.cluster_view.on("updateActions", lang.hitch(this, this.update_actions));
                this.treemap_view.on("updateSelected", lang.hitch(this, this.update_clusterview));
                this.treemap_view.on("deleteCluster", lang.hitch(this, this.recal_cluster));
                this.treemap_view.on("updateActions", lang.hitch(this, this.update_actions));
            }
            this.excluded_cluster_info();
        }

        // keep trace of user interactions with the system
        update_actions(args) {
            let time = this.get_time_string();
            args['time'] = time;
            // console.log(args);
            let data_obj = {"id": this.user_id, "json": args};
            let postArgs = {

                data: json.stringify(data_obj),
                handleAs: "json",
                headers: {
                    "credentials": 'include',
                    "Content-Type": "application/json"
                },
                method: "post",
                withCredentials: true
            };
            // uncomment if you want to save user actions
            //xhr("http://" + this.host + ":8985/save_actions", postArgs);
            // if (args['type']==='search') console.log(data_obj);
            // this.action_records.push(args);
            // console.log("action length", this.action_records.length);
        }

        // update the document list when users do a filtering
        ranklistUpdate_handler(args) {
            let abstract = this;
            let new_response = args;
            abstract.selected_clusters = args['selected_clusters'];
            abstract.total_page = Math.min(Math.floor(new_response['solr_results']['response']['docs'].length / 10-0.1) + 1, 10);
            abstract.page = 1;
            abstract.page_range = abstract.create_page_range(abstract.total_page);
            abstract.update_page(new_response);
        }

        update_treemap(args) {
            this.selected_clusters = args;
            this.treemap_view.selected_clusters = args;
            let action_args = {"type": "updateSelected", "source_view": "cluster_view", "selected_clusters": args};
            this.update_actions(action_args);
            this.treemap_view.update_selected();
        }

        update_clusterview(args) {
            this.selected_clusters = args;
            this.cluster_view.selected_list = args;
            let action_args = {"type": "updateSelected", "source_view": "treemap_view", "selected_clusters": args};
            this.update_actions(action_args);
            this.cluster_view.update_selected_clusters();
        }

        // show cluster summary
        cluster_summary(args) {
            let abstract = this;
            let clusters = args['data']['clusters'];
            let selected_list = args['selected_list'];

            d3.select("#" + abstract.summary_container_id)
                .selectAll("div")
                .remove();
            if (selected_list.length === 1) {
                selected_list.forEach(cid => {
                    let summary = clusters[cid]['summary'];
                    let html = "<p><b>Contextual Examples</b></p>";
                    let color = abstract.color_theme_list[abstract.cluster_view.data['idx_to_groups'][cid]];
                    summary.forEach(item => {
                        let text=item['sent'].split(" ");
                        let c_span = item['c_span'];
                        let count=0;
                        c_span.forEach(span=>{
                            if (span[1]+1+count<=text.length)
                            {
                                text.splice(span[0]+count, 0, "<span style='color: " + color +";'>");
                                count+=1;
                                text.splice(span[1]+1+count,0,"</span>");
                                count+=1;
                            }
                        });

                        let s = text.join(" ");
                        html += ("<p>" + s + "</p>" );
                    })
                    d3.select("#" + abstract.summary_container_id)
                        .append("div")
                        .html(html)
                        .on("mouseenter", function() {
                            let action_args = {"type": "mouseover", "source_view": "summary", "cid": clusters[cid]['cid']};
                            abstract.update_actions(action_args);
                        })
                        .on("mouseleave", function() {
                            let action_args = {"type": "mouseout", "source_view": "summary", "cid": clusters[cid]['cid']};
                            abstract.update_actions(action_args);
                        });
                });
            }
        }

        // requst recommended keywords
        score_request(solr_results, clusters, selected_list, error_num){
            let abstract = this;
            let data_obj = {
                "solr_results": solr_results,
                "clusters": clusters,
                "selected_clusters": selected_list,
                "num_docs": abstract.num_docs
            };
            let postArgs = {

                data: json.stringify(data_obj),
                handleAs: "json",
                headers: {
                    "credentials": 'include',
                    "Content-Type": "application/json"
                },
                method: "post",
                withCredentials: true
            };

            const startTime = performance.now();

            xhr("http://" + this.host + ":8985/search/cluster_score", postArgs).then(function (data) {
                const duration = (performance.now() - startTime)/1000;
                console.log(`update time took ${duration}s`);
                let keyword_info = {
                    "keyword_view_list": data["intersect_cluster"]['concepts'],
                    "concept_list": abstract.concept_list,
                }
                // console.log("keywordinfo", keyword_info["keyword_view_list"]);
                abstract.keyword_view.render(keyword_info);
                // abstract.keyword_view(data["intersect_cluster"]);

            }, function (err) {
                error_num+=1;
                console.log(err);
                if(error_num<=10){
                    abstract.score_request(solr_results, clusters, selected_list, error_num);
                }

            });

        }

        // when user add or delete a cluster/concept, request new cluster set and render the page
        recal_cluster(args) {
            let solr_results = this.cluster_view.data['solr_results'];
            let abstract = this;
            let out_args = {
                "cid": args['cid'],
                "action": args['action'],
                "clusters": this.clusters,
                "concepts_original": this.concepts_original,
                "solr_results": solr_results,
                "top_k_docs": this.num_docs,
                "free_text": this.free_text_query,
                "must_exclude": this.must_exclude
            };
            let action_args = {"type": "ChangeClusters", "source_view": args['source_view'], "cid": args['cid'],
                "action": args["action"]};
            this.update_actions(action_args);
            let postArgs = {

                data: json.stringify(out_args),
                handleAs: "json",
                headers: {
                    "credentials": 'include',
                    "Content-Type": "application/json"
                },
                method: "post",
                withCredentials: true
            };
            const startTime = performance.now();
            abstract.rendering_sign.classed('visible', true);
            xhr("http://" + this.host + ":8985/search/edit_cluster", postArgs).then(function (data) {
                abstract.rendering_sign.classed('visible', false);
                const duration = (performance.now() - startTime)/1000;
                console.log(`update time took ${duration}s`);
                data['solr_results'] = solr_results;
                // console.assert(data['solr_results']['response']['docs']===solr_results['response']['docs']);
                abstract.clusters = data['clusters'];
                abstract.must_exclude = data['must_exclude'];
                abstract.exclude_info = data['exclude_info'];
                abstract.render(data);
                if (args['action']==='add') {
                    abstract.treemap_view.new_highlight = 1;
                    d3.select("#" + abstract.treemap_container_id)
                        .selectAll("g")
                        .filter(function(d, i) {
                            return d.data.node_id === (abstract.clusters.length -1);
                        })
                        .selectAll("rect")
                        .each(function(d, i) {
                            let rect = d3.select(this);
                            rect.style("stroke", "yellow").style("stroke-width", 4);
                        });
                }

            }, function (err) {
                console.log(err);
            });
        }

        // list the deleted concepts at the top, and they can be added back to the concept list
        excluded_cluster_info() {
            let abstract = this;
            d3.select("#excluded_clusters").selectAll("div").remove();
            if (abstract.must_exclude.length > 0) {
                abstract.must_exclude.forEach((cid) => {
                    let text = abstract.exclude_info[cid]['labels'] + " (" + abstract.exclude_info[cid]['size'] + ") ";
                    d3.select("#excluded_clusters")
                        .append("div")
                        .html(text + "<button class='concept_button'>Add</button>")
                        .select("button")
                        .on("click", function(d) {
                            let args = {
                                "cid": [cid], "action": "add", "source_view": "doc_list"
                            };
                            abstract.recal_cluster(args);
                        });
                });
            }
        }

        keyword_recommend(args) {
            this.cluster_summary(args);
            let abstract=this;
            let solr_results = args['data']['solr_results'];
            let clusters = args['data']['clusters'];
            let selected_list = args['selected_list'];
            // console.log("selected_list", selected_list)
            //TODO: remove the keyword bar
            // if (selected_list.length > 0) {
            //     let cluster = {};
            //     if (selected_list.length === 1) {
            //         cluster = clusters[selected_list[0]];
            //         let keyword_info = {
            //             "keyword_view_list": cluster['concepts'],
            //             "concept_list": abstract.concept_list,
            //         }
            //         abstract.keyword_view.render(keyword_info);
            //     }
            //     else {
            //         var error_num = 0;
            //         abstract.score_request(solr_results, clusters, selected_list, error_num);
            //     }
            //
            // }
            // else {
            //     abstract.keyword_view.clear_all();
            // }
        }

        // render the document list
        update_page(data){
            let abstract = this;

            // create the page list
            var solr_result = data['solr_results']['response']['docs'];
            d3.select("#column_container").select("p").text("Shown in the list: " + solr_result.length + "/" + abstract.num_docs);
            var html = "<ul style='width:100%; list-style: none;display: flex;justify-content: center;align-items: center;color: #4c8bf5;'>"

            if (this.page > 1) {
                html += " <li id='" + this.container_id + "_previous' style='cursor: pointer;padding: 10px';>previous page</li>";
                this.previous = true;
            } else
                this.previous = false;

            for (var num in this.page_range) {
                if (this.page_range[num] == this.page)
                    html += " <li class='" + this.container_id + "_num' style='cursor: pointer;color:black;padding:10px;'>" + this.page_range[num].toString() + "</li>";
                else
                    html += " <li class='" + this.container_id + "_num' style='cursor: pointer;padding:10px;'>" + this.page_range[num].toString() + "</li>";
            }

            if (this.page < this.total_page) {
                html += " <li id='" + this.container_id + "_next' style='cursor: pointer;padding: 10px';>next page</li>";
                this.next = true;
            } else
                this.next = false;

            html += "</ul>";
            dom.byId(this.page_container_id).innerHTML = html;
            var nl = query(".abstract_vis_container_num");

            // change to new page
            nl.forEach(item => {
                dojoOn(item, "click", function (evt) {
                    abstract.page = parseInt(this.innerText);
                    abstract.update_page(data);
                    let action_args = {"type": "new_page", "to_page": abstract.page};
                    abstract.update_actions(action_args);
                });

            });

            if (this.previous == true) {
                dojoOn(dom.byId(this.container_id + "_previous"), "click", function (evt) {
                    abstract.page -= 1;
                    abstract.update_page(data);
                    let action_args = {"type": "new_page", "to_page": abstract.page};
                    abstract.update_actions(action_args);
                });
            }
            if (this.next == true) {
                dojoOn(dom.byId(this.container_id + "_next"), "click", function (evt) {
                    abstract.page += 1;
                    abstract.update_page(data);
                    let action_args = {"type": "new_page", "to_page": abstract.page};
                    abstract.update_actions(action_args);
                });
            }

            if (this.page < this.total_page)
                abstract.current_page_docs = solr_result.slice(10 * this.page - 10, 10 * this.page);
            else
                abstract.current_page_docs = solr_result.slice(10 * this.page - 10);

            //create the list of result
            let highlighted_docs=[];
            let highlighted_titles = [];
            let docs = abstract.current_page_docs;
            let target_clusters = [];
            // request highlighting information based on currently selected clusters
            abstract.cluster_view.selected_list.forEach(cluster_id => {
                target_clusters.push(
                    {"labels": abstract.clusters[cluster_id]['labels'],
                        "color": abstract.color_theme_list[abstract.cluster_view.data['idx_to_groups'][cluster_id]]
                    });
            });
            let message = {
                "target_clusters": target_clusters,
                "docs": docs
            }
            let postArgs = {

                data: json.stringify(message),
                handleAs: "json",
                headers: {
                    "credentials": 'include',
                    "Content-Type": "application/json",
                },
                method: "post",
                withCredentials: true
            };

            const startTime = performance.now();

            xhr("http://" + this.host + ":8985/search/highlight_label", postArgs).then(function (data) {
                // render individual documents
                docs = data['docs'];
                // get all the required data
                for (var k in abstract.current_page_docs) {
                    var title = docs[k]['title'][0];
                    var title_spans=docs[k]['title_spans'];
                    title=abstract.highlight_entity(title,title_spans);
                    highlighted_titles.push(title);
                    var abs_full=JSON.stringify(docs[k]['abstract'][0].slice(0)).replace(/\\n/g, '<br><br>');
                    var abs_short = JSON.stringify(docs[k]['abstract'][0].slice(0, 100));
                    var abs_spans=docs[k]['abstract_spans'];
                    // console.log("abstract_span", abs_spans);
                    abs_full=abstract.highlight_entity(abs_full,abs_spans);
                    abs_short=abstract.highlight_entity(abs_short,abs_spans) + "......";
                    var text=[abs_full,abs_short];
                    highlighted_docs.push(text);
                }
                d3.select("#" + abstract.list_container_id)
                    .selectAll('*')
                    .remove();
                // generate text and labels
                for (let k in abstract.current_page_docs) {
                    let url = "https://pubmed.ncbi.nlm.nih.gov/" + docs[k]['pmid'] + "/";
                    // console.log("url", url);
                    let text = highlighted_docs[k][1];
                    let button_text = "Expand";
                    if (abstract.selected_clusters.length > 1 && parseInt(k)===0) {
                        // console.log("auto expand");
                        text = highlighted_docs[k][0];
                        button_text = "  Collapse";
                    }
                    html = "";
                    html += '<span class="title" style="font-weight: bold; font-size:15px;">' + highlighted_titles[k] + '</span>';
                    html += '<a  target = "_blank" href="' + url + '" style="text-decoration: none"> <i class= "fa fa-chain"></i> </a>'
                    html += '<i class= "fa fa-files-o"></i>';
                    // html += '<a  target = "_blank" href="' + url + '" style="text-decoration: none"><span class="title" style="font-weight: bold; font-size:15px;">' + title + '</span></a>';
                    html += "<div style='padding-bottom: 10px;padding-top: 5px'><span class='abstract' >"+text+'</span>';
                    html += "<span class='toggleButton' style='cursor: pointer;font-weight: bold;'>" + button_text + "</span></div>";
                    let doc_div = d3.select("#" + abstract.list_container_id)
                        .append('div')
                        .attr("class", "doc")
                        .html(html);
                    doc_div.select('.fa-files-o')
                        .on("click", function (d) {
                            let copy_content = (docs[k]['title'][0] + " " + url);
                            let action_args = {"type": "copy_doc", "source_view": "doc_list", "pmid": abstract.current_page_docs[k]['pmid']};
                            abstract.update_actions(action_args);
                            navigator.clipboard.writeText(copy_content).then(function() {})
                        })
                        .on("mouseenter", function(d) {d3.select(this).style('background', 'LightSkyBlue');})
                        .on("mouseleave", function(d) {d3.select(this).style('background', '');})
                    doc_div.select('.fa-chain')
                        .on("click", function(d) {
                            let action_args = {"type": "link_doc", "source_view": "doc_list", "pmid": abstract.current_page_docs[k]['pmid']};
                            abstract.update_actions(action_args);
                        });
                }

                // expand and collapse of abstract
                d3.select("#" + abstract.list_container_id)
                    .selectAll('.toggleButton')
                    .on('click', function(td, ti) {
                        if (d3.select(this).text()==="Expand") {
                            d3.select("#" + abstract.list_container_id)
                                .selectAll('.abstract')
                                .filter(function (ad, ai) { return ai === ti;})
                                .html(highlighted_docs[ti][0]);
                            d3.select(this).text("  Collapse");
                            let action_args = {"type": "open_doc", "source_view": "doc_list", "pmid": abstract.current_page_docs[ti]['pmid']};
                            abstract.update_actions(action_args);
                            abstract.abstract_listen(docs);
                        }
                        else {
                            d3.select("#" + abstract.list_container_id)
                                .selectAll('.abstract')
                                .filter(function (ad, ai) { return ai === ti;})
                                .html(highlighted_docs[ti][1]);
                            d3.select(this).text("Expand");
                            let action_args = {"type": "close_doc", "source_view": "doc_list", "pmid": abstract.current_page_docs[ti]['pmid']};
                            abstract.update_actions(action_args);
                            abstract.abstract_listen(docs);
                        }
                    });
                abstract.concept_listener('title');
                abstract.highlight_span('title');
                abstract.concept_listener('abstract');
                abstract.highlight_span('abstract');
                abstract.keyword_view.on("highlightUpdate", lang.hitch(abstract, abstract.highlightUpdate_handler));
            })
        }

        highlightUpdate_handler(args) {
            this.concept_list = args;
            this.highlight_span('title');
            this.highlight_span('abstract');
        }

        // everything related to concepts in documents/texts
        concept_listener(_class) {
            let abstract = this;
            let docs = abstract.current_page_docs;
            d3.select("#" + abstract.list_container_id)
                .selectAll('.' + _class)
                .each(function(td, ti) {
                    let spans = docs[ti][_class + '_spans'].filter(function(item) {return ('cui_list' in item);});
                    d3.select(this)
                        .selectAll('.cui')
                        .on('mouseover', function(cd, ci) {
                            // console.log(abstract.concept_list);
                            d3.select(this).style("background", "yellow");
                            let action_args = {"type": "mouseover", "source_view": "doc_list", "cid": spans[ci]['cui_list']};
                            abstract.update_actions(action_args);
                        })
                        .on('mouseout', function(cd, ci) {
                            let exist = false;
                            spans[ci]['cui_list'].forEach(item => {
                                if (item in abstract.concept_list) exist = true;
                            });
                            if (!exist) d3.select(this).style("background", null);
                            let action_args = {"type": "mouseout", "source_view": "doc_list", "cid": spans[ci]['cui_list']};
                            abstract.update_actions(action_args);
                        })
                        .on('click', function(cd, ci) {
                            let mention = d3.select(this).text();
                            spans[ci]['cui_list'].forEach(item => {
                                if (item in abstract.concept_list) {
                                    if (!abstract.concept_list[item].includes(mention))
                                        abstract.concept_list[item].push(mention);
                                }
                                else{
                                    abstract.concept_list[item] = [mention];
                                }
                            });
                            let action_args = {"type": "selection", "source_view": "doc_list", "cid": spans[ci]['cui_list']};
                            abstract.update_actions(action_args);
                            abstract.update_concepts();
                        })
                        .on('contextmenu', function(cd, ci) {
                            d3.event.preventDefault();
                            let mention = d3.select(this).text();
                            abstract.context_menu.style('left', d3.event.pageX).style('top', d3.event.pageY).classed('visible',true);
                            abstract.context_menu.selectAll('div').on('click', function(d) {
                                if (d3.select(this).text()==="Search on Google") {
                                    let search_url = "https://www.google.com/search?q=" + mention;
                                    window.open(search_url, '_blank').focus();
                                    let action_args = {"type": "search", "source_view": "doc_list", "cid": spans[ci]['cui_list']};
                                    abstract.update_actions(action_args);
                                }
                                else {
                                    let new_cui = [];
                                    spans[ci]['cui_list'].forEach(item => {
                                        let concept_exist = false;
                                        abstract.clusters.forEach(c => {
                                            if (c['cid'] === item) concept_exist=true;
                                        })
                                        if (!concept_exist) new_cui.push(item);
                                    });
                                    if (new_cui.length > 0) {
                                        let args = {
                                            "cid": new_cui, "action": "add", "source_view": "doc_list"
                                        }
                                        abstract.recal_cluster(args);
                                    }
                                }
                            })

                        })
                });
        }

        // update the keyword view
        update_concepts() {
            this.highlight_span('title');
            this.highlight_span('abstract');
            this.keyword_view.update_highlight(this.concept_list);
        }

        // listen to the action done on abstract, used when expand or collapse
        abstract_listen(docs){
            let abstract = this;
            abstract.concept_listener('abstract');
            abstract.highlight_span('abstract');
        }

        // highlight selected concepts
        highlight_span(_class) {
            let abstract = this;
            let docs = abstract.current_page_docs;
            d3.select("#" + abstract.list_container_id)
                .selectAll('.' + _class)
                .each(function(td, ti) {
                    // some spans are generated because of the selected text, they may not be snomed concepts
                    let title_spans = docs[ti][_class + '_spans'].filter(function(item) {return ('cui_list' in item);});
                    d3.select(this)
                        .selectAll('.cui')
                        .each(function(cd, ci) {
                            let concepts = title_spans[ci]['cui_list'];
                            let exist = false;
                            concepts.forEach(item => {
                                if (item in abstract.concept_list) exist = true;
                            })
                            if (exist) d3.select(this).style("background", "yellow");
                            else d3.select(this).style("background", null);
                        });
                });
        }

        // generate html format with colored span, used for rendering the document list
        highlight_entity(text,span){
            text=text.split(" ");
            var count=0;
            span.forEach(item=>{
                let span = item['span'];
                if (span[1]+1+count<=text.length)
                {
                    // console.log(item);
                    let color = 'rgb(0, 51, 102)';
                    if ('color' in item) color = item['color'];
                    if ('cui_list' in item) text.splice(span[0]+count, 0, "<span class='cui' style='color: " + color +";'>");
                    else text.splice(span[0]+count, 0, "<span style='color: " + color +";'>");
                    // if ('color' in item) {
                    //
                    //     // console.log("has color");
                    //     //" + item['color'] +"
                    //     text.splice(span[0]+count, 0, ("<span style='color: " + item['color'] +";'>"));
                    // }
                    // else text.splice(span[0]+count, 0, "<span class='cui' style='color: rgb(47, 187, 171);'>");
                    count+=1;
                    text.splice(span[1]+1+count,0,"</span>");
                    count+=1;
                }

            })

            return text.join(" ")

        }

        create_page_range(total_page) {
            var pages = [];
            for (let i = 1; i <= total_page; i++) {
                pages.push(i);
            }
            return pages
        }

        get_data(postArgs,error_num){
            let abstract=this;
            const startTime = performance.now();
            abstract.rendering_sign.classed('visible', true);
            xhr("http://" + this.host + ":8985/search/query", postArgs).then(function (data) {
                const duration = (performance.now() - startTime)/1000;
                console.log(`update time took ${duration}s`);
                // console.log(data);
                if (data['solr_results']['response']['docs'].length == 0) {
                    dom.byId(abstract.list_container_id).innerHTML = "There is no relevant abstracts";
                } else {
                    abstract.rendering_sign.classed('visible', false);
                    abstract.num_docs = data['solr_results']['response']['docs'].length;
                    abstract.clusters = data['clusters'];
                    abstract.must_exclude = data['must_exclude'];
                    abstract.concepts_original = data['concepts_original']
                    abstract.render(data);

                }
            }, function (err) {
                error_num+=1;
                console.log(err);
                if(error_num<=10){
                    abstract.get_data(postArgs,error_num);
                }
                else {
                    d3.select("#" + abstract.list_container_id).html("<p style='color:DarkRed'>Error! Check query syntax.</p>")
                }
            });

        }


    }

})


