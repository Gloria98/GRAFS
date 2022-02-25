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
            super(dom_container_id, ["updateSelected", "treeMouseover", "treeMouseout", "deleteCluster", "updateActions"]);
            this.container_id = dom_container_id;
            this.margin = {top: 10, right: 10, bottom: 10, left: 10};
            this.width = 100;
            this.height = 0.25 * this.width;
            this.selected_clusters = [];
            this.disabled_list = [];
            this.new_highlight = 0; // highlight the one that's been newly added
            // this.color_theme_list = ["LightSkyBlue", "LightGreen", "LightSalmon", "BlueViolet", "Aquamarine", "RosyBrown",
            //     "SandyBrown", "Plum", "CornflowerBlue", "Olive", "Brown", "CadetBlue",
            //     "BurlyWood", "Chartreuse", "Crimson", "Cyan", "DarkBlue","DarkCyan",
            //     "DarkGoldenRod", "DarkGreen", "DarkMagenta", "DarkOrange", "DarkRed", "DarkSeaGreen",
            //     "DarkSlateBlue", "FireBrick", "GoldenRod", "Khaki","LightGrey"];
            this.color_theme_list = ['#a6cee3','#1f78b4','#b2df8a','#33a02c','#fb9a99','#e31a1c','#fdbf6f','#ff7f00','#cab2d6','#b667b8','#b15928','#BDB76B',
                '#a6cee3','#1f78b4','#b2df8a','#33a02c','#fb9a99','#e31a1c','#fdbf6f','#ff7f00','#cab2d6','#bc80bd','#b15928'];
        }

        resize() {
            let self = this;
            // this.width = d3.select("#" + this.container_id).node().getBoundingClientRect().width;
            // this.height = 0.25 * this.width;
            // console.log("resize treemap");
            this.render_treemap();
            // this.svg
            //     .attr("width", this.width + this.margin.left + this.margin.right)
            //     .attr("height", this.height + this.margin.top + this.margin.bottom)
            //     .style("background-color", "green");
        }

        init(data, clusters) {
            this.data = data;
            this.clusters = clusters;
            this.selected_clusters = [];
            this.width = d3.select("#" + this.container_id).node().getBoundingClientRect().width;
            this.height = 0.25 * this.width;
            let self = this;
            d3.select("#" + this.container_id).select("svg").remove();
            this.fill_list = [];
            clusters.forEach(c => {
                this.fill_list.push(1.0);
            })
            // append the svg object to the body of the page
                // .append("g")
                // .attr("transform",
                //     "translate(" + this.margin.left + "," + this.margin.top + ")");
            self.render_treemap();
            // d3.select(window).on('resize.updatesvg', function(_d) {
            //     console.log("resize treemap");
            //     self.render_treemap();
            // });
        }

        render_treemap() {
            let self = this;
            d3.select("#" + this.container_id).select("svg").remove();
            this.width = d3.select("#" + this.container_id).node().getBoundingClientRect().width;
            this.height = 0.25 * this.width;
            this.svg = d3.select("#" + this.container_id)
                .append("svg")
                .style("width", self.width)
                .style("height", self.height)
                // .attr("viewBox", [0, 0, this.width, this.height])
                .style("font", "sans-serif");
                // .style("font-size", "13pt");

            var treemap = d3.treemap()
                .tile(d3.treemapResquarify)
                .size([self.width, self.height])
                .round(true)
                .paddingInner(1);

            var root = d3.hierarchy(self.data)
                .eachBefore(function(d) { d.data.id = (d.parent ? d.parent.data.id + "." : "") + d.data.name; })
                .sum(function(d){ return d.value}).sort((a, b) => a.value - b.value);

            treemap(root);

            // self.svg.selectAll('*').remove();

            // self.svg.selectAll("clipPath")
            //     .data(root.leaves())
            //     .enter().append("clipPath")
            //     .attr("id", function(d) { return "clip-" + d.data.id; })
            //     .append("rect")
            //     .attr("x", 0)
            //     .attr("y", 0)
            //     .attr("width", function(d) { return d.x1 - d.x0; })
            //     .attr("height", function(d) { return d.y1 - d.y0; })
            //     .attr("clipPathUnits", "objectBoundingBox")
            self.leaf = self.svg.selectAll("g")
                .data(root.leaves())
                .enter().append("g")
                .attr("transform", function(d) { return "translate(" + d.x0 + "," + d.y0 + ")"; });
            // console.log("root", root.leaves());

            // context menu
            this.context_menu = d3.select("#" + this.container_id)
                .append("div")
                .attr('id', 'context-menu')
                .html('<div class="item">Delete</div><div class="item">Search on Google</div>');
            this.render_rect();
        }

        render_rect() {
            // Give the data to this cluster layout:
            let self=this;

            let color = d3.scaleOrdinal(d3.schemeCategory10)
            let format = d3.format(",d");

            self.leaf.append("rect")
                .attr("id", function(d) { return d.data.id; })
                .attr("width", function(d) { return d.x1 - d.x0; })
                .attr("height", function(d) { return d.y1 - d.y0; })
                // .attr("fill", d => { while (d.depth > 5) d = d.parent; return color(d.data.name); });
                .attr("fill", function(d) {return self.color_theme_list[d.data.color];})
                .attr("fill-opacity", 0.6)
                .classed("back_rect", true);

            self.leaf.append("rect")
                .attr("id", function(d) { return d.data.id; })
                .attr("y", function(d) { return ((1-self.fill_list[d.data.node_id])*(d.y1 - d.y0)); })
                .attr("width", function(d) { return d.x1 - d.x0; })
                .attr("height", function(d) { return (self.fill_list[d.data.node_id]*(d.y1 - d.y0)); })
                // .attr("fill", d => { while (d.depth > 5) d = d.parent; return color(d.data.name); });
                .attr("fill", function(d) {return self.color_theme_list[d.data.color];})
                .classed("front_rect", true);

            self.leaf.append("text")
                .attr("clip-path", function(d) {return "polygon(0% 0%, " + (d.x1 - d.x0) + " 0%, "+ (d.x1 - d.x0) + " 100%, 0% 100%)"})
                .selectAll("tspan")
                // .data(function(d) { return d.data.name.split(/(?=[A-Z][^A-Z])/g); })
                .data(function(d) { return d.data.name.split(" "); })
                .enter().append("tspan")
                .style("font-size", "12pt")
                .attr("x", 4)
                .attr("y", function(d, i) { return 13 + i * 10; })
                .text(function(d) { return d; });

            d3.select("#" + this.container_id)
                .selectAll("g")
                .on("mouseenter", function(d, index) {
                    d3.select(this).select(".front_rect")
                        .style("stroke", "yellow")
                        .style("stroke-width", 4);
                    self.dispatcher.call("treeMouseover", self, d.data.node_id);
                })
                .on("mouseleave", function(d, index) {
                    d3.select(this).select(".front_rect")
                        .style("stroke", function(_d) {return self.selected_clusters.includes(d.data.node_id)? "yellow": null})
                        .style("stroke-width", function(_d) {return self.selected_clusters.includes(d.data.node_id)? 4: null});
                    self.dispatcher.call("treeMouseout", self, d.data.node_id);
                })
                .on("click", function(d, index) {
                    if ((!self.disabled_list.includes(d.data.node_id)) && (!self.selected_clusters.includes(d.data.node_id))) {
                        self.selected_clusters.push(d.data.node_id);
                        let action_args = {"type": "selection", "source_view": "treemap_view", "cid": self.clusters[d.data.node_id]['cid']};
                        self.dispatcher.call("updateActions", self, action_args);
                        self.update_selected();
                        self.dispatcher.call("updateSelected", self, self.selected_clusters);
                    }
                    // if (!self.selected_clusters.includes(d.data.node_id)) self.selected_clusters.push(d.data.node_id);
                    // console.log(self.selected_clusters);
                    // self.update_selected();
                    // self.dispatcher.call("updateSelected", self, self.selected_clusters);
                })
                .on("contextmenu", function(d, index) {
                    d3.event.preventDefault();
                    // .style('left', d3.event.pageX).style('top', d3.event.pageY)
                    self.context_menu.classed('visible',true).style('left', d3.event.pageX + "px").style('top', d3.event.pageY + "px");
                    console.log(d3.event.pageX, d3.event.pageY);
                    self.context_menu.selectAll('div').on('click', function(_d) {
                        if (d3.select(this).text()==='Delete'){
                            let cid = self.clusters[d.data.node_id]['cid'];
                            let args = {'cid': cid, 'action': 'delete', 'source_view': "treemap_view"};
                            console.log(args);
                            self.dispatcher.call("deleteCluster", self, args);
                        }
                        else {
                            let search_url = "https://www.google.com/search?q=" + self.clusters[d.data.node_id]['labels'][0];
                            window.open(search_url, '_blank').focus();
                            let action_args = {"type": "search", "source_view": "treemap_view", "cid": self.clusters[d.data.node_id]['cid']};
                            self.dispatcher.call("updateActions", self, action_args);
                        }
                    })
                })

            // highlight stroke
            d3.select("#" + this.container_id)
                .selectAll(".front_rect")
                .each(function(d, index) {
                    if (self.selected_clusters.includes(d.data.node_id)) {
                        d3.select(this)
                            .style("stroke", "yellow")
                            .style("stroke-width", 4);
                    }
                    else if ((self.new_highlight > 0) && (d.data.node_id===(self.clusters.length-1))) {
                        console.log("enter");
                        d3.select(this)
                            .style("stroke", "yellow")
                            .style("stroke-width", 4);
                    }
                    else {
                        d3.select(this)
                            .style("stroke", null)
                            .style("stroke-width", null);
                    }
                });
        }

        update_selected() {
            let self = this;
            // highlight the selected clusters
            self.disabled_list = [];
            self.fill_list = [];
            let cluster_doc_id = new Set();
            let clusters = self.clusters;
            if (self.new_highlight > 0) self.new_highlight = 0;
            if (self.selected_clusters.length > 0) {
                self.selected_clusters.forEach((id, index) => {
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
                });
                clusters.forEach((c, i) => {
                    if (self.selected_clusters.includes(i)) {
                        let total = self.clusters[i]['documents'].length;
                        let fill = cluster_doc_id.size/total;
                        self.fill_list.push(fill);
                    }
                    else {
                        let docs = self.clusters[i]['documents'];
                        let intersect = [];
                        docs.forEach(doc => {
                            if (cluster_doc_id.has(doc)) intersect.push(doc);
                        })
                        if (intersect.length === 0) self.disabled_list.push(i);
                        let fill = intersect.length/docs.length;
                        self.fill_list.push(fill);
                    }
                });
            }
            else {
                clusters.forEach(c => {self.fill_list.push(1.0);});
            }
            self.leaf.selectAll("*").remove();
            self.render_rect();

        }
    }
})