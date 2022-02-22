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
    "vaclab/VaclabVis",
], (dojo, declare, lang, dojoOn, dom, domStyle, xhr, json, domConstruct, parser, query, dijit, DropDownButton, TooltipDialog, CheckedMenuItem, CheckBox, _WidgetBase, _Container, registry, VaclabVis) => {
    return class extends VaclabVis {

        constructor(dom_container_id) {
            super(dom_container_id, ["update", "ranklistUpdate", "keywordUpdate", "updateSelected", "deleteCluster", "updateActions"]);

            this.container_id = dom_container_id;
            this.selected_list = [];
            this.id_list = [];
            this.arc_threshold = 0;
            this.intersect_docs = [];
            this.list_open = [true, true, true, true, true, true];
            let container = dom.byId(this.container_id);
            // this.color_theme_list = ["LightSkyBlue", "LightGreen", "LightSalmon", "BlueViolet", "Aquamarine", "RosyBrown",
            //     "SandyBrown", "Plum", "CornflowerBlue", "Olive", "Brown", "CadetBlue",
            //     "BurlyWood", "Chartreuse", "Crimson", "Cyan", "DarkBlue","DarkCyan",
            //     "DarkGoldenRod", "DarkGreen", "DarkMagenta", "DarkOrange", "DarkRed", "DarkSeaGreen",
            //     "DarkSlateBlue", "FireBrick", "GoldenRod", "Khaki","LightGrey"];
            this.color_theme_list = ['#a6cee3','#1f78b4','#b2df8a','#33a02c','#fb9a99','#e31a1c','#fdbf6f','#ff7f00','#cab2d6','#b667b8','#b15928','#BDB76B',
                '#a6cee3','#1f78b4','#b2df8a','#33a02c','#fb9a99','#e31a1c','#fdbf6f','#ff7f00','#cab2d6','#bc80bd','#b15928'];
            container.innerHTML =
                "<div id='cluster_container' class='list-group' style='padding: 0px; width: 60%; float: right;'></div>";

        }

        resize(width, height) {
            console.log("resize==========");
            // this.render(true);
        }


        init(data) {
            this.data = data;
            this.render(true);
            d3.select("#"+this.container_id).select('#tooltip').remove();
            this.tooltip = d3.select("#" + this.container_id)
                .append("div")
                .attr("id", "tooltip")
                .style("position", "absolute")
                .style("visibility", "hidden")
                .style("border", "1px solid LightGrey")
                .style("border-radius", "8px")
                .style("padding", "2px");
            this.context_menu = d3.select("#" + this.container_id)
                .append("div")
                .attr('id', 'context-menu')
                .html('<div class="item">Search on Google</div>');
        }

        render(first_time) {

            // registry.byId("cluster_container").destroyDescendants();
            d3.select("#"+this.container_id).select("#cluster_container").selectAll('*').remove();
            d3.select("#"+this.container_id)
                .select("svg")
                .remove();
            let self = this;
            var clusters = self.data['clusters'];
            var solr_result = self.data['solr_results']['response']['docs'];
            var cluster_doc_id = new Set(); // documents in the intersection of all the selected clusters
            self.selected_list = []; // clusters selected by user
            let num_clusters = clusters.length;
            // id_list keeps the order of all the clusters
            const cluster_order = self.data['cluster_order'];
            self.id_list = cluster_order;
            let color = d3.scaleOrdinal(d3.schemeCategory10)
            self.render_layout();

            // actions for cluster selection
            d3.select("#"+self.container_id)
                .select("#cluster_container")
                .on("change", function() {
                    // clear previously selected clusters and start over again
                    cluster_doc_id.clear();
                    // go through all the clusters, if a cluster is selected, get the intersection,
                    // if a cluster is not selected, make sure it's removed from the selected cluster list
                    d3.select("#cluster_container").selectAll(".cluster_entry")
                        .each(function (d, i) {
                            let index = parseInt(d3.select(this).attr("id"), 10);
                            if(d3.select(this).select("input").property("checked")){
                                if(!self.selected_list.includes(index)) {
                                    self.selected_list.push(index);
                                    let action_args = {"type": "selection", "source_view": "cluster_view", "cid": self.data['clusters'][index]['cid']};
                                    self.dispatcher.call("updateActions", self, action_args);
                                }
                            }
                            else{
                                // d3.select(this).style("background-color", null);
                                if(self.selected_list.includes(index)) {
                                    const del = self.selected_list.findIndex(x => x===index);
                                    self.selected_list.splice(del, 1);
                                    let action_args = {"type": "unselection", "source_view": "cluster_view", "cid": self.data['clusters'][index]['cid']};
                                    self.dispatcher.call("updateActions", self, action_args);
                                }
                            }
                        });
                    self.update_selected_clusters();
                    let args = {"type": "updateSelected", "source_view": "cluster_view", "selected_clusters": self.selected_list};
                    self.dispatcher.call("updateActions", self, args);
                });
        }

        update_selected_clusters() {
            let self = this;
            const cluster_order = self.data['cluster_order'];
            var clusters = self.data['clusters'];
            const num_clusters = clusters.length;
            var cluster_doc_id = new Set(); // documents in the intersection of all the selected clusters
            var solr_result = self.data['solr_results']['response']['docs'];
            // collect docs in the intersection
            self.selected_list.forEach((id, index) => {
                let docids = clusters[id]['documents'];
                if (cluster_doc_id.size==0) {
                    docids.forEach(item => cluster_doc_id.add(item));
                }
                else {
                    let intersec = new Set();
                    docids.forEach(item => {
                        if (cluster_doc_id.has(item)) {
                            intersec.add(item);
                        }
                    });
                    cluster_doc_id = intersec;
                }
            })
            self.intersect_docs = [...cluster_doc_id];
            // create the cluster list again
            d3.select("#"+self.container_id).select("#cluster_container").selectAll('div').remove();
            self.render_layout();
            var new_response;
            if(self.selected_list.length===0) {
                new_response=self.data;
                new_response['selected_clusters'] = [];

            }
            else {
                let new_docs = solr_result.filter(function(d, i){
                    return cluster_doc_id.has(i);
                });
                new_response={
                    "solr_results":{
                        "response": {
                            "docs": new_docs
                        }
                    },
                    "selected_clusters": self.selected_list
                };
            }
            self.dispatcher.call("ranklistUpdate", self, new_response);
        }

        render_layout() {
            let self = this;
            let clusters = self.data['clusters'];
            let idx_to_groups = self.data['idx_to_groups'];
            let type_name = ['Body Parts', 'Diseases & Disorders', 'Signs & Symptoms', 'Medical Procedures', 'Lab Tests', 'Medications']
            let ignore_list = [];
            self.list_open.forEach((open_i, index) => {
                if (!open_i) {
                    let begin = self.data['type_pos'][index];
                    let end = 0;
                    if (index===5) end = clusters.length;
                    else {
                        for (let i = index+1; i < 6; i++) {
                            if (self.data['type_pos'][i] > 0) {
                                end = self.data['type_pos'][i];
                                break;
                            }
                        }
                        if (end===0) end = clusters.length;
                    }
                    for (let i = begin; i < end; i++) ignore_list.push(i);
                }
            });
            // console.log("ignore", ignore_list);
            self.id_list.forEach((id,index) => {
                if (self.data['type_pos'].includes(index)) {
                    let type = self.data['type_pos'].indexOf(index);
                    let icon = "fa-chevron-down";
                    if (!self.list_open[type]) icon = "fa-chevron-right";
                    d3.select("#"+self.container_id)
                        .select("#cluster_container")
                        .append("div")
                        .classed("list-group-item", true)
                        .classed("ctype", true)
                        .attr("id", type)
                        .html("<label style='font-size: 15px'>"+ "<i class=\"fa " + icon + "\"></i>" +type_name[type]+"</label>")
                        .style("background", self.color_theme_list[type])
                        .style("opacity", 0.8)
                }
                if (!ignore_list.includes(index)) {
                    let item = clusters[id];
                    let intersect = []
                    var freq = item['documents'].length;
                    let text = "";
                    item['labels'].forEach((entry, i) => {
                        if (i < 3) {
                            text += entry;
                            if (i < (item['labels'].length -1) && (i<2)) text += ", ";
                        }
                    })
                    if (self.intersect_docs.length===0) text+=" ("+ freq+")";
                    else if (self.selected_list.includes(id)) text+=" ("+self.intersect_docs.length + "/" + freq+")";
                    else {
                        item['documents'].forEach(d => {
                            if (self.intersect_docs.includes(d)) intersect.push(d);
                        });
                        text+=" ("+intersect.length + "/" + freq+")";
                    }
                    // console.log(box);
                    let cluster_entry = d3.select("#"+self.container_id)
                        .select("#cluster_container")
                        .append("div")
                        .attr("id", id)
                        .classed("list-group-item", true)
                        .classed("list-group-item-action", "active")
                        .classed("cluster_entry", true);

                    cluster_entry.append("div")
                        .style("margin-left", "10%")
                        .html("<label style='font-size: 15px; color: black'>"+text+"</label> <input type=\"checkbox\" style='float: right;'/>");
                    if (self.selected_list.includes(id)) {
                        cluster_entry.style("background-color", self.color_theme_list[self.data['idx_to_groups'][id]]);
                        cluster_entry.select("input").property("checked", true);
                    }
                    else if ((self.intersect_docs.length>0) && (intersect.length===0)) {
                        cluster_entry.select("label").style("color", "gray");
                        cluster_entry.select("input").property("disabled", true);
                    }
                }

            });
            // abstract.cluster_arcs.update(nodeData);
            self.cluster_listener();
            let keyword_update_args = {
                "data": self.data,
                "selected_list": self.selected_list
            };
            self.dispatcher.call("keywordUpdate", self, keyword_update_args);
        }

        cluster_listener() {
            let self=this;

            d3.select("#"+self.container_id)
                .select("#cluster_container").selectAll(".cluster_entry")
                .on("mouseenter", function (d, i) {
                    let index = parseInt(d3.select(this).attr("id"), 10);
                    let cluster_id = index;
                    d3.select(this).style("background-color", self.color_theme_list[self.data['idx_to_groups'][cluster_id]]);
                    let rect = d3.select(this).node().getBoundingClientRect();
                    let top = rect.y;
                    let right = rect.x;
                    let width = 2 * rect.width/3;
                    let left = right - width;
                    let item = self.data['clusters'][cluster_id]['summary'][0];
                    let text = item['sent'].split(" ");
                    let c_span = item['c_span'];
                    let count=0;
                    c_span.forEach(span=>{
                        if (span[1]+1+count<=text.length)
                        {
                            text.splice(span[0]+count, 0, "<span style='color: " + self.color_theme_list[self.data['idx_to_groups'][cluster_id]] +";'>");
                            count+=1;
                            text.splice(span[1]+1+count,0,"</span>");
                            count+=1;
                        }
                    });
                    let s = text.join(" ");
                    self.tooltip.style("visibility", "visible")
                        .style("width", (width - 16) + "px")
                        .style("left", (left) + "px")
                        .style("top", top + "px")
                        .html(("<p>" + s + "</p>" ));
                    let action_args = {"type": "mouseover", "source_view": "cluster_view", "cid": self.data['clusters'][cluster_id]['cid']};
                    self.dispatcher.call("updateActions", self, action_args);
                })
                .on("mouseleave", function (d, i) {
                    let index = parseInt(d3.select(this).attr("id"), 10);
                    let cluster_id = index;
                    d3.select(this).style("background-color", self.selected_list.includes(cluster_id)?self.color_theme_list[self.data['idx_to_groups'][cluster_id]]:null);
                    self.tooltip.style("visibility", "hidden");
                    let action_args = {"type": "mouseout", "source_view": "cluster_view", "cid": self.data['clusters'][cluster_id]['cid']};
                    self.dispatcher.call("updateActions", self, action_args);
                })
                .on('contextmenu', function(cd, ci) {
                    d3.event.preventDefault();
                    let index = parseInt(d3.select(this).attr("id"), 10);
                    self.context_menu.style('left', d3.event.pageX).style('top', d3.event.pageY).classed('visible',true);
                    self.context_menu.selectAll('div').on('click', function(d) {
                        let search_url = "https://www.google.com/search?q=" + self.data['clusters'][index]['labels'][0];
                        window.open(search_url, '_blank').focus();
                        let action_args = {
                            "type": "search",
                            "source_view": "cluster_view",
                            "cid": self.data['clusters'][index]['cid']
                        };
                        self.dispatcher.call("updateActions", self, action_args);
                    });
                })
            d3.select("#"+self.container_id).select("#cluster_container").selectAll(".ctype")
                .on("click", function(d) {
                    let type = parseInt(d3.select(this).attr("id"), 10);
                    if (self.list_open[type]) {
                        self.list_open[type]=false;
                    }
                    else {
                        self.list_open[type]=true;
                    }
                    d3.select("#"+self.container_id).select("#cluster_container").selectAll('div').remove();
                    self.render_layout();
                })
        }

        update(new_data) {
            this.data = new_data;
            this.render(false);
        }
    }
})