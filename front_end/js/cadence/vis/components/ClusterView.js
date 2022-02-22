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
            let container = dom.byId(this.container_id);
            // this.color_theme_list = ["LightSkyBlue", "LightGreen", "LightSalmon", "BlueViolet", "Aquamarine", "RosyBrown",
            //     "SandyBrown", "Plum", "CornflowerBlue", "Olive", "Brown", "CadetBlue",
            //     "BurlyWood", "Chartreuse", "Crimson", "Cyan", "DarkBlue","DarkCyan",
            //     "DarkGoldenRod", "DarkGreen", "DarkMagenta", "DarkOrange", "DarkRed", "DarkSeaGreen",
            //     "DarkSlateBlue", "FireBrick", "GoldenRod", "Khaki","LightGrey"];
            this.color_theme_list = ['#a6cee3','#1f78b4','#b2df8a','#33a02c','#fb9a99','#e31a1c','#fdbf6f','#ff7f00','#cab2d6','#b667b8','#b15928','#BDB76B',
                '#a6cee3','#1f78b4','#b2df8a','#33a02c','#fb9a99','#e31a1c','#fdbf6f','#ff7f00','#cab2d6','#bc80bd','#b15928'];
            container.innerHTML =
                "<div id='arc_level'>" +
                // "<div>Arc Threshold: <input type='text' class='arc_threshold' value='0'></div>"+
                "</div>"+
                "<div id='cluster_container' class='list-group' style='padding: 0px; width: 60%; float: right;'></div>";

        }

        resize(width, height) {
            // console.log("resize==========");
            // this.render(false);
        }


        init(data, treemap_view) {
            this.data = data;
            this.treemap_view = treemap_view;

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
            self.render_layout(first_time);

            // actions for cluster selection
            d3.select("#"+self.container_id)
                .select("#cluster_container")
                .on("change", function() {
                    // check whether each cluster is selected or not, add newly selected and remove those being unselected
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
                    self.dispatcher.call("updateSelected", self, self.selected_list);
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
            self.id_list = [];
            self.selected_list.forEach(item => {self.id_list.push(item);});
            // console.log(self.selected_list);
            for (let i=0; i<num_clusters; i++) {
                let id = cluster_order[i];
                if (!self.id_list.includes(id)) self.id_list.push(id);
            }
            // console.log(self.id_list)
            self.render_layout(false);
            var new_response;
            if(self.selected_list.length===0) {
                new_response=self.data;
                d3.select("#cluster_container").selectAll(".cluster_entry")
                    .each(function (d, i) {
                        d3.select(this).select("label").style("color", "black");
                        d3.select(this).select("input").property("disabled", false);
                    });
            }
            else {
                d3.select("#cluster_container").selectAll(".cluster_entry")
                    .each(function (d, i) {
                        let index = parseInt(d3.select(this).attr("id"), 10);
                        if (self.selected_list.includes(index)) {
                            let freq = clusters[index]['documents'].length;
                            let select_freq = cluster_doc_id.size;
                            let text = "";
                            clusters[index]['labels'].forEach((entry, i) => {
                                text += entry;
                                if (i < (clusters[index]['labels'].length -1)) text += ", ";
                            })
                            d3.select(this).style("background-color", self.color_theme_list[self.data['idx_to_groups'][index]]);
                            d3.select(this).select("input").property("checked", true);
                            //TODO: this may mess up the dot's places since the size of div might be bigger
                            // d3.select(this).select("label").text(text+" ("+select_freq + "/" + freq+")");
                        }
                        let docids = clusters[index]['documents'];
                        //console.log(i, docids);
                        let empty = true;
                        docids.forEach(item => {
                            if (cluster_doc_id.has(item)) {
                                empty = false;
                            }
                        });
                        if (empty) {
                            d3.select(this).select("label").style("color", "gray");
                            d3.select(this).select("input").property("disabled", true);
                        }
                        else {
                            d3.select(this).select("label").style("color", "black");
                            d3.select(this).select("input").property("disabled", false);
                        }

                    });
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

        render_layout(first_time) {
            let self = this;
            let clusters = self.data['clusters'];
            let idx_to_groups = self.data['idx_to_groups'];
            let current_class = -1;
            self.id_list.forEach((id,index) => {
                // add div to split different topics
                if (!self.selected_list.includes(id)) {
                    let group = self.data['idx_to_groups'][id];
                    if (group != current_class) {
                        current_class = group;
                        d3.select("#"+self.container_id)
                            .select("#cluster_container")
                            .append("div")
                            .classed("list-group-item", true)
                            .classed("group_divide", true)
                            .style("height", "10px")
                            .style("background-color", self.color_theme_list[current_class])
                            .style("opacity", 0.5);
                    }
                }

                // specify the text of each cluster
                let item = clusters[id];
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
                    let intersect = [];
                    item['documents'].forEach(d => {
                        if (self.intersect_docs.includes(d)) intersect.push(d);
                    });
                    text+=" ("+intersect.length + "/" + freq+")";
                }

                // render the div
                let cluster_div = d3.select("#"+self.container_id)
                    .select("#cluster_container")
                    .append("div")
                    .attr("id", id)
                    .classed("list-group-item", true)
                    .classed("cluster_entry", true)
                    .style("border-left-color", self.color_theme_list[self.data['idx_to_groups'][id]])
                    .style("border-left-width", "thick");
                    // .classed("list-group-item-action", "active")
                cluster_div.html("<label style='font-size: 15px'>"+text+"</label> <i class=\"fa fa-trash-o\" style='float: right'></i> <input type=\"checkbox\" style='float: right;'/>")
                    .select(".fa-trash-o")
                    .on("click", function(_d) {
                        let args = {"cluster_id": id, "cid": item['cid'], "action": "delete", "solr_results": self.data['solr_results'], "source_view": "cluster_view"};
                        self.dispatcher.call("deleteCluster", self, args);
                    });
            });

            // draw arcs
            let nodeData = self.process_connection(clusters, self.id_list, idx_to_groups);
            self.draw_arc(nodeData,first_time);
            let keyword_update_args = {
                "data": self.data,
                "selected_list": self.selected_list
            };
            self.dispatcher.call("keywordUpdate", self, keyword_update_args);
        }

        process_connection(clusters, id_list, idx_to_groups) {
            let self = this;
            let links = [];
            let nodes = [];
            let global_inter_num = [];
            // give one node for selected clusters
            if (self.selected_list.length===0) {
                id_list.forEach((id,index) => {
                    let item = clusters[id];
                    nodes.push({"id": index, "name": item['labels'][0], "color": idx_to_groups[id]});
                })
            }
            else {
                // get the color of the shared node
                let group_num = idx_to_groups[self.selected_list[0]];
                let same_group = true;
                for (let i = 1; i < self.selected_list.length; i++) {
                    if (group_num != idx_to_groups[self.selected_list[i]]) same_group=false;
                }
                const color = same_group ? group_num:-1;
                nodes.push({"id": 0, "name": "combo", "color": color});

                // get docs in the selected clusters
                let selected_doc_id = new Set();
                self.selected_list.forEach((id, index) => {
                    let docids = clusters[id]['documents'];
                    if (selected_doc_id.size==0) {
                        docids.forEach(item => selected_doc_id.add(item));
                    }
                    else {
                        let intersec = new Set();
                        docids.forEach(item => {
                            if (selected_doc_id.has(item)) {
                                intersec.add(item);
                            }
                        });
                        selected_doc_id = intersec;
                    }
                });

                // get the remaining nodes and links
                for (let i = self.selected_list.length; i < id_list.length; i++) {
                    let cluster_id = id_list[i];
                    let item = clusters[cluster_id];
                    // consider that all the selected concepts has the same node
                    let node_id = i + 1 - self.selected_list.length;
                    // add new node
                    nodes.push({"id": node_id, "name": item['labels'][0], "color": idx_to_groups[cluster_id]});
                    let cand = clusters[cluster_id]['documents'];
                    let intersec = [];
                    cand.forEach((doc) => {
                        if (selected_doc_id.has(doc)) intersec.push(doc);
                    });
                    // add new links
                    if (intersec.length > 0) {
                        links.push({"source": 0, "target": node_id, "docs": intersec, "color": color});
                    }
                }
            }
            // id_list.forEach((id,index) => {
            //     // id is the cluster id, index is the index in the list
            //     let item = clusters[id];
            //     nodes.push({"id": index, "name": item['labels'][0], "color": idx_to_groups[id]});
            //     let anchor = item['documents'];
            //     for (let i = index + 1; i < id_list.length; i++) {
            //         let cand = clusters[id_list[i]]['documents'];
            //         let intersec = [];
            //         // check whether the two exist in each level of themes
            //         let theme_info = [false, false];
            //         if (idx_to_groups[id] === idx_to_groups[id_list[i]]) theme_info[0] = true;
            //         else theme_info[1] = true;
            //         cand.forEach((doc) => {
            //             if (anchor.includes(doc)) intersec.push(doc);
            //         });
            //         if (intersec.length > 0) {
            //             links.push({"source": index, "target": i, "docs": intersec, "theme_info": theme_info});
            //             if (theme_info[1]===true) global_inter_num.push(intersec.length);
            //         }
            //     }
            // });
            //TODO: only set the threshold automatically at the beginning
            // global_inter_num.sort(function(a, b){return a-b});
            // let global_thre = global_inter_num[global_inter_num.length-5];
            // self.arc_threshold[1] = global_thre;

            let nodeData = {"nodes": nodes, "links": links};
            return nodeData;
        }

        draw_arc(nodeData, first_time) {
            let self=this;
            var clusters = self.data['clusters'];
            let num_clusters = clusters.length;
            let x = 0; // cluster panel's start x
            let start = 0; // cluster panel's start y
            let end = 0; // cluster panel's end y
            let col_x = 0; // the start x of the entire left column
            let y_height = []; // the list keeps the heights of all the items in the cluster list

            // get the above defined values
            let num_div = d3.select("#"+self.container_id).select("#cluster_container").selectAll("div").size();
            d3.select("#"+self.container_id)
                .select("#cluster_container")
                .selectAll("div")
                .each(function (d, i) {
                    let rect = d3.select(this).node().getBoundingClientRect();
                    y_height.push(rect.height);
                    if (i===0) {
                        x = rect.x;
                        start = rect.y;
                    }
                    if (i===(num_div-1)) {
                        let one_height = rect.height;
                        end = rect.y + one_height;
                    }
                });

            let col_rect = d3.select("#"+self.container_id).node().getBoundingClientRect();
            col_x = col_rect.x;

            let conn_width = x - col_x - 10; // svg's width
            let conn_height = end-start; //svg's height

            // append svg to the left column
            if (first_time) {
                d3.select("#"+self.container_id)
                    .append("svg")
                    // .attr("preserveAspectRatio", "xMinYMin meet")
                    // .attr("viewBox", "0 0 " + conn_width + " " + conn_height)
                    .style("background-color", "white");
            }
            else {
                d3.select("#"+self.container_id)
                    .select("svg")
                    .selectAll("*")
                    .remove();
            }
            var svg = d3.select("#"+self.container_id)
                .select("svg")
                .attr("width", conn_width)
                .attr("height", conn_height)
                .attr("x", col_x)
                .attr("y", start);

            // get the positions to draw the nodes
            var y_pos = [];
            // get the position of the combo node
            if (self.selected_list.length > 0) {
                let comb_node = 0;
                for (let i=0; i<self.selected_list.length; i++) {
                    comb_node += y_height[i];
                }
                y_pos.push(comb_node/2);
                let prev = comb_node;
                for (let i=self.selected_list.length; i<y_height.length; i++) {
                    let div_class = d3.select("#"+self.container_id)
                        .select("#cluster_container")
                        .selectAll("div")
                        .filter(function(d, nd) {return nd===i;})
                        .classed("cluster_entry");
                    if (div_class) y_pos.push(prev + y_height[i]/2);
                    prev += y_height[i];
                }
            }
            else {
                let prev = 0;
                for (let i=0; i<y_height.length; i++) {
                    let div_class = d3.select("#"+self.container_id)
                        .select("#cluster_container")
                        .selectAll("div")
                        .filter(function(d, nd) {return nd===i;})
                        .classed("cluster_entry");
                    if (div_class) y_pos.push(prev + y_height[i]/2);
                    prev += y_height[i];
                }
            }
            // get the index of clusters in the original list
            // let id_list = [];
            // d3.select("#"+self.container_id)
            //     .select("#cluster_container").selectAll("div")
            //     .each(function(d) {
            //         let id = parseInt(d3.select(this).attr("id"), 10);
            //         id_list.push(id);
            //     });
            // draw the nodes
            let color = d3.scaleOrdinal(d3.schemeCategory10);
            var nodes = svg
                .selectAll("mynodes")
                .data(nodeData.nodes)
                .enter()
                .append("circle")
                .attr("cx", conn_width)
                .attr("cy", function(d){ return(y_pos[d.id])})
                .attr("r", 8)
                .style("fill", function(d){ return d.color===-1 ? "DarkGrey":(self.color_theme_list[d.color])});
            // draw the path
            // thickness of the links
            nodeData.links.sort(function(a,b) {return b.docs.length - a.docs.length;});
            let min_link = 0;
            if (nodeData.links.length > 0) min_link = nodeData.links[Math.min(4, nodeData.links.length - 1)].docs.length;
            var thick = d3.scaleLinear()
                .rangeRound([1, 6])
                .domain([min_link, d3.max(nodeData.links, function (d) {
                    return d.docs.length;
                })]);

            var links = svg
                .selectAll('mylinks')
                .data(nodeData.links)
                .enter()
                .filter(function(d) {return d.docs.length >= min_link;})
                .append('path')
                .attr('d', function (d) {
                    start = y_pos[d.source]    // X position of start node on the X axis
                    end = y_pos[d.target]       // X position of end node
                    return ['M', conn_width, start,    // the arc starts at the coordinate x=start, y=height-30 (where the starting node is)
                        'A',                            // This means we're gonna build an elliptical arc
                        (start - end)/(2*4), ',',    // Next 2 lines are the coordinates of the inflexion point. Height of this point is proportional with start - end distance
                        (start - end)/2, 0, 0, ',',
                        start < end ? 0 : 1, conn_width, ',', end] // We always want the arc on top. So if end is before start, putting 0 here turn the arc upside down.
                        .join(' ');
                })
                .style("fill", "none")
                .attr("stroke", function(d){ return d.color===-1 ? "DarkGrey":(self.color_theme_list[d.color])})
                .style('stroke-width', function(d){
                    if (d.docs.length < min_link) {return 0;}
                    else return thick(d.docs.length);
                });
                //.attr("stroke", function(d){ return(self.color_theme_list[self.data['idx_to_groups'][self.id_list[d.source]]])})
                // .style('stroke-opacity', arc_opacity);

            // Add the highlighting functionality
            d3.select("#"+self.container_id)
                .select("#cluster_container").selectAll(".cluster_entry")
                .on("mouseenter", function (d, i) {
                    let index = parseInt(d3.select(this).attr("id"), 10);
                    let action_args = {"type": "mouseover", "source_view": "cluster_view", "cid": self.data['clusters'][index]['cid']};
                    self.dispatcher.call("updateActions", self, action_args);
                    mouseover_handler(i);
                })
                .on("mouseleave", function(d, i) {
                    let index = parseInt(d3.select(this).attr("id"), 10);
                    let action_args = {"type": "mouseout", "source_view": "cluster_view", "cid": self.data['clusters'][index]['cid']};
                    self.dispatcher.call("updateActions", self, action_args);
                    mouseout_handler(i);
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

            self.treemap_view.on("treeMouseover", lang.hitch(this, treeMouseover_handler));
            self.treemap_view.on("treeMouseout", lang.hitch(this, treeMouseout_handler));

            function treeMouseover_handler(args) {
                let cluster_id = args;
                let i = self.id_list.findIndex(id => id===cluster_id);
                let action_args = {"type": "mouseover", "source_view": "treemap_view", "cid": self.data['clusters'][cluster_id]['cid']};
                self.dispatcher.call("updateActions", self, action_args);
                mouseover_handler(i);
            }

            function treeMouseout_handler(args) {
                let cluster_id = args;
                let i = self.id_list.findIndex(id => id===cluster_id);
                let action_args = {"type": "mouseout", "source_view": "treemap_view", "cid": self.data['clusters'][cluster_id]['cid']};
                self.dispatcher.call("updateActions", self, action_args);
                mouseout_handler(i);
            }

            function mouseover_handler(_i) {
                let i = 0
                let type_name = ['Body Parts', 'Diseases & Disorders', 'Signs & Symptoms', 'Medical Procedures', 'Lab Tests', 'Medications']
                // get node id
                if (self.selected_list.length===0) i = _i;
                else if (_i >= self.selected_list.length) i = _i - self.selected_list.length + 1;

                // color nodes and links
                nodes.each(function (node, node_i) {
                    if (node_i===i) d3.select(this).style('fill', function(d){ return d.color===-1 ? "DarkGrey":(self.color_theme_list[d.color])});
                    else d3.select(this).style('fill', "#B8B8B8");
                });
                links.each(function (link, link_i) {
                    d3.select(this).style('stroke', function (_d) {
                        if (_d.source === i || _d.target === i) return _d.color===-1 ? "DarkGrey":(self.color_theme_list[_d.color]);
                        else return '#b8b8b8';
                    })
                        .style('stroke-opacity', function (link_d) { return link_d.source === i || link_d.target === i ? 1 : 0.3;})
                    // .style('stroke-width', function (link_d) { return link_d.source === i || link_d.target === i ? 4 : 1;});
                });

                // add tooltip
                let cluster_id = self.id_list[_i];
                d3.select("#"+self.container_id)
                    .select("#cluster_container").selectAll(".cluster_entry")
                    .filter(function(d, di) {return di === _i;})
                    .style("background-color", self.color_theme_list[self.data['idx_to_groups'][cluster_id]]);
                let top = 0;
                let width = d3.select("#"+self.container_id).select('svg').attr("width");
                let left = d3.select("#"+self.container_id).select('svg').attr("x");
                let right = 0;
                d3.select("#"+self.container_id)
                    .select("#cluster_container").selectAll(".cluster_entry")
                    .filter(function(d, di) {return di === _i;})
                    .each(function(d) {
                        let rect = d3.select(this).node().getBoundingClientRect();
                        top = rect.y;
                        right = rect.x;
                    })
                left = right - width;
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
                let type_description = "<p><b>" + type_name[self.data['clusters'][cluster_id]["c_type"]] + "</b></p>";
                let s = text.join(" ");
                self.tooltip.style("visibility", "visible")
                    .style("width", (width - 16) + "px")
                    .style("left", (left) + "px")
                    .style("top", top + "px")
                    .html((type_description + "<p>" + s + "</p>" ));
                // console.log(left);
                // console.log(d3.select("#"+self.container_id).select('svg').attr("x"));
                // if (self.selected_list.length>0 && (!self.selected_list.includes(cluster_id))) {
                //     let intersect = [];
                //     console.log("new number");
                //     clusters[cluster_id]['documents'].forEach(doc => {
                //         if (self.intersect_docs.includes(doc)) intersect.push(doc);
                //     })
                //     d3.select("#"+self.container_id)
                //         .select("#cluster_container").selectAll("div")
                //         .filter(function(d, di) {return di === _i;})
                //         .each(function(d, di) {
                //             let freq = clusters[cluster_id]['documents'].length;
                //             let select_freq = intersect.length;
                //             let text = "";
                //             clusters[cluster_id]['labels'].forEach((entry, i) => {
                //                 text += entry;
                //                 if (i < (clusters[cluster_id]['labels'].length -1)) text += ", ";
                //             })
                //             d3.select(this).select("label").text(text+" ("+select_freq + "/" + freq+") ");
                //
                //         });
                // }
            }
            function mouseout_handler(_i) {
                nodes.style("fill", function(d){ return d.color===-1 ? "DarkGrey":(self.color_theme_list[d.color])});
                links
                    .style("stroke", function(d){ return d.color===-1 ? "DarkGrey":(self.color_theme_list[d.color])})
                    .style('stroke-width', function(d){return thick(d.docs.length)})
                    .style("stroke-opacity", 1);
                // .style('stroke-opacity', arc_opacity);
                let cluster_id = self.id_list[_i];
                d3.select("#"+self.container_id)
                    .select("#cluster_container").selectAll(".cluster_entry")
                    .filter(function(d, di) {return di === _i;})
                    .style("background-color", self.selected_list.includes(cluster_id)?self.color_theme_list[self.data['idx_to_groups'][cluster_id]]:null);
                self.tooltip.style("visibility", "hidden");
                // if (self.selected_list.length>0 && (!self.selected_list.includes(cluster_id))) {
                //
                //     d3.select("#"+self.container_id)
                //         .select("#cluster_container").selectAll("div")
                //         .filter(function(d, di) {return di === _i;})
                //         .each(function(d, di) {
                //             let freq = clusters[cluster_id]['documents'].length;
                //             let text = "";
                //             clusters[cluster_id]['labels'].forEach((entry, i) => {
                //                 text += entry;
                //                 if (i < (clusters[cluster_id]['labels'].length -1)) text += ", ";
                //             })
                //             d3.select(this).select("label").text(text+" ("+freq+") ");
                //
                //         })
                // }
            }

            d3.select(window).on('resize.updatesvg', function(_d) {
                self.draw_arc(nodeData, false);
            });

            // arc threshold
            // d3.select("#" + self.container_id).select("#arc_level")
            //     .select(".arc_threshold")
            //     .on("change", function(_d, ai) {
            //         self.arc_threshold = parseInt(d3.select(this).property("value"));
            //         console.log(self.arc_threshold);
            //         self.draw_arc(nodeData, false);
            //     });
            // arc opacity
            // d3.select("#" + self.container_id).select("#arc_level")
            //     .selectAll('.slider')
            //     .on("change", function(_d, i) {
            //         self.arc_opacity[i] = parseFloat(d3.select(this).property('value'));
            //         // console.log(abstract.arc_opacity);
            //         links.style('stroke-opacity', arc_opacity);
            //     })
        }

        update(new_data) {
            this.data = new_data;
            this.render(false);
        }
    }
})