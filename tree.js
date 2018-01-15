function plot_tree(d3, data, chart){
    // set some layout variables
    var positionInfo = chart.getBoundingClientRect();
    var el_height = positionInfo.height;
    var el_width = positionInfo.width;

    var margin = {top: 20, right: 20, bottom: 30, left: 40},
        svg_width = el_width - margin.left - margin.right,
        svg_height = el_height - margin.top - margin.bottom;
    
    var svg = d3.select(chart).append("svg")
        .attr("width", svg_width + margin.left + margin.right)
        .attr("height", svg_height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    
    var nodes = d3.hierarchy(data);
   
    var treemap = d3.tree()
        .size([svg_width, svg_height]);
    
    nodes = treemap(nodes);
    var n_classes = nodes.descendants().slice(1)[0].data.values.length;
    var n_samples = nodes.data.values.reduce(add, 0);
    var hue_scale = d3.scaleLinear().domain([0, n_classes]).range([0, 360]);

    function add(a, b) {return a + b;};
    function purity(values){return Math.max(...values)/values.reduce(add, 0);};
    function indexOfMax(arr) {
        if (arr.length === 0) {
            return -1;
        }
        var max = arr[0];
        var maxIndex = 0;
        for (var i = 1; i < arr.length; i++) {
            if (arr[i] > max) {
                maxIndex = i;
                max = arr[i];
            }
        };
        return maxIndex;
    };
    function get_link_color(values){
        var hue = (hue_scale(indexOfMax(values)) + 30)%360;
        var saturation = 100*purity(values);
        var lightness = 120 * (1-purity(values)/2);
        var color = d3.hcl(hue, saturation, lightness);
        return color;
    };
    function getBB(selection) {
        selection.each(function(d){d.bbox = this.getBBox();})
    };
    function legend_colors(i){
        var values = [0, 0, 0];
        values[i] = 1;
        return get_link_color(values);
    };
    function path_width(values){
        var path_width = 20;
        return values.reduce(add,0)*path_width/n_samples;
    }; 

    // this function draws all tree paths and arrows
    function draw_tree(nodes){
        var graph = svg.append('g').attr('id', 'graph');
        var link = graph.selectAll('.g')
            .data(nodes.descendants().slice(1).reverse())
          .enter().append('g')
        var paths = link.append("path")
            .attr("class", "link")
            .attr("d", function(d) {
               return "M" + d.x + "," + d.y
                 + "C" + d.x + "," + (d.y + d.parent.y) / 2
                 + " " + d.parent.x + "," +  (d.y + d.parent.y) / 2
                 + " " + d.parent.x + "," + d.parent.y;
               })
            .attr('stroke-linecap', 'round')
            .attr('style', function(d) {return 'fill:None;stroke:'
                + get_link_color(d.data.values) + ';stroke-width:' 
                    + path_width(d.data.values) + ';'});

        var arrows = link.filter(function (d) {
            return path_width(d.data.values) > 1;}).append("path")
            .attr('class', 'arrowhead')
            .attr('stroke-linecap', 'round')
            .attr("d", function(d) {
                width = path_width(d.data.values);
                return "M" + (d.x - width/1.5) + "," + d.y
                  + "L" + d.x + "," + (d.y + width)
                  + "L" + (d.x + width/1.5) + "," + d.y;})
            .style("fill", function (d) {
                return get_link_color(d.data.values);})
            .style('stroke', 'white')
            .style('stroke-width', function(d){
               return path_width(d.data.values)/5});
        return link;
    };
    
    function draw_rules(nodes){
        var node = svg.selectAll(".rule").data(nodes)
          .enter().append("g")
            .attr('class', 'rule')
            .attr('transform', function(d) {
                return "translate(" + d.x + "," + d.y + ")";});
        
        var path_nodes = node.filter(function (d, i) { return i > 0;});
        path_nodes.append("text")
              .attr("dy", ".35em")
              .attr("y", -10)
              .style("text-anchor", "middle")
              .text(function(d) { return d.data.rule;}).call(getBB)
              .attr('pointer-events', 'none')
              .attr('font-size', '12');
        path_nodes.insert("rect","text")
            .attr("x", function(d){return -d.bbox.width/2})
            .attr("y", function(d){return -d.bbox.height})
            .attr("width", function(d){return d.bbox.width})
            .attr("height", function(d){return d.bbox.height})
            .style("fill", "white")
            .attr('pointer-events', 'none')
            .style('opacity', 0.8);
        
        var leaf_node = node.filter(function (d, i) { return i == 0;});
        leaf_node.append("text")
              .attr("dy", ".35em")
              .attr("y", -10)
              .style("text-anchor", "middle")
              .attr('font-size', '12')
              .text(function(d) { return d.data.rule;}).call(getBB)
              .attr('pointer-events', 'none');
        leaf_node.insert("rect", "text")
            .attr("x", function(d){return -d.bbox.width/2})
            .attr("y", function(d){return -d.bbox.height})
            .attr("width", function(d){return d.bbox.width})
            .attr("height", function(d){return 50})
            .style("fill", "white")
            .attr('pointer-events', 'none')
            .style('opacity', 0.8);
    
        var total_width = 100;
        var bar_width = total_width / n_classes;
        var bar_height = 20;
        var max_value = Math.max(...nodes[0].data.values);
    
        var histogram = leaf_node.append('g').selectAll('.rect')
            .data(nodes[0].data.values)
            .enter();
        histogram.append('rect')
            .attr('x', function(d, i) {return -total_width/2 + i * bar_width;})
            .attr('y', function(d) {
                return 10 + bar_height - d * bar_height/max_value})
            .attr('width', 0.9 * bar_width)
            .attr('height', function(d) {return d * bar_height/max_value})
            .attr('fill', function(d, i) {return legend_colors(i)});
    };

    // draw tree and add the mouse events to the tree
    var link = draw_tree(nodes);
    
    link.on("mouseover", function (d) {
            var path = d3.select(this);
            path.transition().duration("4000");
            var ancestors = d.ancestors();
            draw_rules(ancestors);
            })
        .on("mouseout", function (d) {
            var path = d3.select(this).transition().duration("4000");
            svg.selectAll('.rule.rule').remove();
            });
   
    // legend
    var rect_width = 20;
    var max_value = Math.max(...nodes.data.values);
    
    var legend = svg.append('g').attr('id', 'legend')
        .selectAll('.rect')
        .data(nodes.data.class_names)
        .enter();
    
    legend.append('rect')
        .attr('x', 0)
        .attr('y', function(d, i) {return i*(1.1 * rect_width);})
        .attr('width', function(d, i) {
            return nodes.data.values[i]*2*rect_width/max_value;})
        .attr('height', 20)
        .attr('fill', function(d, i) {return legend_colors(i);});
    
    legend.insert('text')
        .attr('x', 2)
        .attr('y', function(d, i) {return i*(1.1 * rect_width);})
        .attr('dy', rect_width/2 + 4)
        .text(function(d, i) {return nodes.data.values[i];})
        .style('fill', 'black')
        .attr('font-size', '12')
        .style('text-anchor', "left");
    
    legend.insert('text')
        .attr('x', function(d, i) {
            return 5 + 2*nodes.data.values[i]*rect_width/max_value;})
        .attr('y', function(d, i) {return i*(1.1 * rect_width);})
        .attr('dy', rect_width/2 + 4)
        .text(function(d) {return d;})
        .style('fill', 'black')
        .attr('font-size', '12')
        .style('text-anchor', "left");
};
