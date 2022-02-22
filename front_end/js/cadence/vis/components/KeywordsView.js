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
                super(dom_container_id, ["highlightUpdate", "updateActions"]);
                this.container_id = dom_container_id;
                this.keyword_view_list = {}; // concept to show in the bar view
                this.concept_list = {}; // concepts (cui) selected by the user, need highlighting
                let container = dom.byId(this.container_id);
                container.innerHTML =
                    "<div id='concept_cards' style='padding: 10px; background-color: white; border-radius: 5px; border: 1px solid; border-color: #DCDDDE; margin-top: 10px;'>" +
                    "<div style=\"font-weight: bold;\">Highlighted Concepts</div>"+
                    "</div>";

            }

            resize(width, height) {
                // console.log("resize==========");
            }

            init(data) {
                this.keyword_view_list = data['keyword_view_list'];
                this.concept_list = data['concept_list'];

            }

            update(data) {
                this.keyword_view_list = data['keyword_view_list'];
                this.concept_list = data['concept_list'];

            }

            render(data) {
                this.keyword_view_list = data['keyword_view_list'];
                this.concept_list = data['concept_list'];
                this.draw_bar();
            }

            clear_all() {
                d3.select("#"+this.container_id)
                    .selectAll("svg")
                    .remove();
            }

            draw_bar() {
                let self = this;
                var data = [];
                let freq_list = [], rel_list = [], name_list = [], cui_list = [];

                d3.select("#"+self.container_id)
                    .selectAll("svg")
                    .remove();

                for (let cui in self.keyword_view_list) {
                    let entry = {};
                    if (name_list.includes(self.keyword_view_list[cui]['mentions'][0])) {
                        entry['Concept'] = cui;
                    }
                    else entry['Concept'] = self.keyword_view_list[cui]['mentions'][0];
                    entry['Frequency'] = self.keyword_view_list[cui]['net_count'];
                    entry['Relevance'] = self.keyword_view_list[cui]['score'];
                    entry['cui'] = cui;
                    data.push(entry);
                    freq_list.push(entry['Frequency']);
                    rel_list.push(entry['Relevance']);
                    name_list.push(entry['Concept']);
                    cui_list.push(cui);
                }
                console.log("keyword", data);
                var margin = {
                    top: 15,
                    right: 35,
                    bottom: 15,
                    left: 120
                };

                // get svg width and height
                let box = d3.select("#"+self.container_id)
                    .node().getBoundingClientRect();

                var svg_width = box.width,
                    svg_height = 100;

                var graph_width = (svg_width - margin.left)/2 - margin.right,
                    graph_height = svg_height - margin.top - margin.bottom;

                var x = d3.scaleLinear()
                    .rangeRound([0, graph_width])
                    .domain([0, d3.max(data, function (d) {
                        return d.Frequency;
                    })]);

                var y = d3.scaleBand()
                    .rangeRound([0, graph_height])
                    .padding(0.1)
                    .domain(data.map(function (d) {
                        return d.Concept;
                    }));

                var svg = d3.select("#"+self.container_id).append("svg")
                    .attr("preserveAspectRatio", "xMinYMin meet")
                    .attr("viewBox", "0 0 " + svg_width + " " + svg_height);
                // .attr("width", svg_width)
                // .attr("height", svg_height);

                var g1 = svg.append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                g1.append("g").call(d3.axisLeft(y));

                var bars = g1.selectAll(".bar1").data(data).enter().append("g")

                //append rects
                bars.append("rect")
                    .attr("class", "bar1")
                    .attr("y", function (d) {
                        return y(d.Concept);
                    })
                    .attr("height", y.bandwidth())
                    .attr("x", 0)
                    .attr("width", function (d) {
                        return x(d.Frequency);
                    }).attr("fill" , "black");

                //add a value label to the right of each bar
                bars.append("text")
                    .attr("class", "label")
                    //y position of the label is halfway down the bar
                    .attr("y", function (d) {
                        return y(d.Concept) + y.bandwidth() * (0.5 + 0.2);
                    })
                    //x position is 3 pixels to the right of the bar
                    .attr("x", function (d) {
                        return x(d.Frequency) + 15;
                    })
                    .text(function (d) {
                        return d.Frequency;
                    })
                    .attr("font-family" , "sans-serif")
                    .attr("font-size" , "12px")
                    .attr("fill" , "black")
                    .attr("text-anchor", "middle");


                var x2 = d3.scaleLinear()
                    .rangeRound([0, graph_width])
                    .domain([0, d3.max(data, function (d) {
                        return d.Relevance;
                    })]);

                var g2 = svg.append("g")
                    .attr("transform", "translate(" + (margin.left + margin.right + graph_width) + "," + margin.top + ")");


                var bars2 = g2.selectAll(".bar2").data(data).enter().append("g")

                //append rects
                bars2.append("rect")
                    .attr("class", "bar2")
                    .attr("y", function (d) {
                        return y(d.Concept);
                    })
                    .attr("height", y.bandwidth())
                    .attr("x", 0)
                    .attr("width", function (d) {
                        return x2(d.Relevance);
                    }).attr("fill" , "black");

                //add a value label to the right of each bar
                bars2.append("text")
                    .attr("class", "label")
                    //y position of the label is halfway down the bar
                    .attr("y", function (d) {
                        return y(d.Concept) + y.bandwidth() * (0.5 + 0.2);
                    })
                    //x position is 3 pixels to the right of the bar
                    .attr("x", function (d) {
                        return x2(d.Relevance) + 15;
                    })
                    .text(function (d) {
                        return d.Relevance.toFixed(2);
                    })
                    .attr("font-family" , "sans-serif")
                    .attr("font-size" , "12px")
                    .attr("fill" , "black")
                    .attr("text-anchor", "middle");
                g1.append("text")
                    .attr("class", "label")
                    .attr("x", 0)
                    .attr("y", 0)
                    .text("Frequency");
                g2.append("text")
                    .attr("class", "label")
                    .attr("x", 0)
                    .attr("y", 0)
                    .text("Relevance");
                self.highlight_bar();
                self.keyword_view_listen();
            }

            highlight_bar() {
                let self = this;
                let cui_list = [];
                for (let cui in self.keyword_view_list) cui_list.push(cui);
                d3.select("#"+self.container_id)
                    .select("svg")
                    .selectAll(".bar1")
                    .each(function(d, i) {
                        if (cui_list[i] in self.concept_list) d3.select(this).style('fill', 'yellow');
                        else d3.select(this).style('fill', 'black');
                    });
                d3.select("#"+self.container_id)
                    .select("svg")
                    .selectAll(".bar2")
                    .each(function(d, i) {
                        if (cui_list[i] in self.concept_list) d3.select(this).style('fill', 'yellow');
                        else d3.select(this).style('fill', 'black');
                    });
            }

            keyword_view_listen() {
                let self = this;
                let cui_list = [];
                for (let cui in self.keyword_view_list) cui_list.push(cui);
                d3.select("#"+self.container_id)
                    .select("svg")
                    .select("g")
                    .selectAll("text")
                    .each(function(cd, ci) {
                        let bar1 = d3.select("#"+self.container_id)
                            .select("svg")
                            .selectAll(".bar1")
                            .filter(function (bd, bi) { return bi === ci;});
                        let bar2 = d3.select("#"+self.container_id)
                            .select("svg")
                            .selectAll(".bar2")
                            .filter(function (bd, bi) { return bi === ci;});
                        let concept = cui_list[ci];
                        d3.select(this)
                            .on("mouseover", function(d) {
                                bar1.style("fill", "yellow");
                                bar2.style("fill", "yellow");
                                let action_args = {"type": "mouseover", "source_view": "keyword_view", "cid": concept};
                                self.dispatcher.call("updateActions", self, action_args);
                            })
                            .on("mouseout", function(d) {
                                if (!(concept in self.concept_list)) {
                                    bar1.style("fill", "black");
                                    bar2.style("fill", "black");
                                    let action_args = {"type": "mouseout", "source_view": "keyword_view", "cid": concept};
                                    self.dispatcher.call("updateActions", self, action_args);
                                }
                            })
                            .on("click", function(d) {
                                let mention = d3.select(this).text();
                                if (concept in self.concept_list) {
                                    if (!self.concept_list[concept].includes(mention))
                                        self.concept_list[concept].push(mention);
                                }
                                else{
                                    self.concept_list[concept] = [mention];
                                }
                                // let docs = abstract.current_page_docs;
                                let action_args = {"type": "selection", "source_view": "keyword_view", "cid": concept};
                                self.dispatcher.call("updateActions", self, action_args);
                                self.update_concepts();
                            })
                    })

            }

            render_concept() {
                let self = this;
                d3.select("#"+self.container_id).select("#concept_cards").selectAll("button").remove();
                d3.keys(self.concept_list).forEach(key => {
                    let html = "<span>";
                    const total_mention = self.concept_list[key].length;
                    // console.log(self.concept_list[key].length);
                    self.concept_list[key].forEach((m, i) => {
                        html += m;
                        if (i<(total_mention-1)) html += ",";
                    });
                    html += "</span>";
                    d3.select("#concept_cards")
                        .append("button")
                        .attr("type", "button")
                        .html(html)
                        .append("span")
                        .text(" X ")
                        .on("click", function(d, i) {
                            delete self.concept_list[key];
                            self.update_concepts();
                            let action_args = {"type": "unselection", "source_view": "keyword_view", "cid": key};
                            self.dispatcher.call("updateActions", self, action_args);
                        });
                });
                //TODO: required if want keyword bar
                // self.highlight_bar();
            }

            update_highlight(data) {
                this.concept_list = data;
                this.render_concept();
            }

            update_concepts() {
                this.render_concept();
                this.dispatcher.call("highlightUpdate", this, this.concept_list);
            }


        }
    }
)