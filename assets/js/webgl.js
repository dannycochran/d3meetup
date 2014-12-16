var webglGrapher = function () {
  var grapher = {
    colors: ['#d73027', '#f46d43', '#fdae61', '#fee090', '#e0f3f8', '#abd9e9', '#74add1', '#4575b4', '#FFFFFF'],
    initialize: function () {
      this.brush = d3.svg.brush().on('brushend', this.onBrushEnd.bind(this));
      this.zoom = d3.behavior.zoom();

      this.$el = $('div.network-container');
      this.$header = $('header');
      this.$svg = d3.select(this.$el.get(0)).append('svg').attr({width: '100%', height: '100%'});
      this.$brush = this.$svg.append('g').attr('class', 'brush');
      this.$brush.append('rect');

      this.$brush.call(this.brush);
      d3.select(this.$el.get(0)).call(this.zoom);

      this.$el.on('mousedown mouseup mousemove', this.onMouseEvent.bind(this));
      this.$header.find('button:not(#colorings)').on('click', this.toggleNetwork.bind(this));
      this.$header.find('button#colorings').on('click', this.updateColorings.bind(this));

      $(window).on('keydown', this.setBrushEnabled.bind(this));
      $(window).on('keyup', this.setBrushEnabled.bind(this));
    },

    render: function (data) {
      data = _.clone(data);
      this.width = this.$el.width();
      this.height = this.$el.height();

      var headerTitle = 'Network in WebGl (' + data.nodes.length + ' nodes & ' + data.links.length + ' links)';
      this.$header.find('span').html(headerTitle);

      // transform x & y coordinates to viewport
      var positionDomain = [
            d3.extent(data.nodes, function (n) { return n.x; }),
            d3.extent(data.nodes, function (n) { return n.y; })
          ],
          scaleRange = 10,
          dataWidth = Math.max(positionDomain[0][1] - positionDomain[0][0], 1), // don't divide by 0
          dataHeight = Math.max(positionDomain[1][1] - positionDomain[1][0], 1),
          maxDimension = Math.max(dataWidth, dataHeight),
          scale = Math.min(this.width / dataWidth, this.height / dataHeight, 2) / 1.1, // 1.1 pads the network
          xTranslate = (this.width - dataWidth * scale) / 2 - positionDomain[0][0] * scale,
          yTranslate = (this.height - dataHeight * scale) / 2 - positionDomain[1][0] * scale;
      this.transform = {translate: [xTranslate, yTranslate], scale: scale};
      this.previous = {};

      // set up d3 zoom
      this.zoom // scale range factor of 10
        .scaleExtent([this.transform.scale / scaleRange, this.transform.scale * scaleRange])
        .translate(this.transform.translate)
        .scale(this.transform.scale)
        .on('zoom', this.onZoom.bind(this));

      this.brush.x(d3.scale.identity().domain(positionDomain[0]))
          .y(d3.scale.identity().domain(positionDomain[1]))
          .clamp([false, false]); // Let the user select outside the domain of the graph
      this.$brush.select('rect').attr({
          width: maxDimension * scaleRange * 2,
          height: maxDimension * scaleRange * 2,
          x: -maxDimension * scaleRange,
          y: -maxDimension * scaleRange,
        }).style({'visibility': 'hidden', 'cursor': 'crosshair'});

      // clear the previous graph
      this.$el.find('canvas').remove();

      // modify data to have a radius
      _.each(data.nodes, function (n) { n.r = 1 + n.row_ids.length; });

      // make new grapher
      var Grapher = Ayasdi.Grapher;
      Grapher.setPalette('RdYlBu', this.colors);

      this.canvas = new Grapher(this.width, this.height, {transparent:true});
      this.canvas.palette('RdYlBu');
      this.canvas.data(data);

      this.canvas.foregroundColor('#ffffff');

      this.$el.append(this.canvas.view);
      this.canvas.render();

      // transform the network
      this.data = data;
      this.updateTransform();
      this.updateColorings();
      return this;
    },

    onMouseEvent: function (e) {
      if (this.$el.css('cursor') === 'move') return;
      var evt = document.createEvent('MouseEvent');
      evt.initMouseEvent(e.type, e.canBubble,e.cancelable,e.view,e.detail,e.screenX,e.screenY,e.clientX,e.clientY,e.ctrlKey,e.altKey,e.shiftKey,e.metaKey,e.button,e.relatedTarget);
      this.$brush.node().dispatchEvent(evt);
    },

    onZoom: function () {
      // If we're zooming with the mouse wheel or dragging with the alt key pressed, update the transform
      if (this.transform.scale !== d3.event.scale || d3.event.sourceEvent.altKey || d3.event.sourceEvent.ctrlKey) {
        this.transform = {translate: d3.event.translate, scale: d3.event.scale};
        this.updateTransform();
      } else this.zoom.translate(this.transform.translate);
    },

    onBrushEnd: function () { // Select the brushed nodes then remove the brush
      var r = this.brush.extent(),
          selectedNodes = {},
          transform = this.transform,
          transformX = function (x) { return x * transform.scale + transform.translate[0]; },
          transformY = function (y) { return y * transform.scale + transform.translate[1]; };
      _.each(this.data.nodes, function (d) {
        var x = transformX(d.x), y = transformY(d.y);
        if(r[0][0] <= x && x < r[1][0] && r[0][1] <= y && y < r[1][1]) selectedNodes[d.id] = true;
      });
      this.selectedNodes = selectedNodes;
      this.$brush.call(this.brush.clear());

      this.updateSelectedNodes();
    },

    setBrushEnabled: function (e) {
      if (e.type === 'keydown' && (e.altKey || e.ctrlKey)) this.$el.addClass('brush-disabled');
      else if (e.type === 'keyup') this.$el.removeClass('brush-disabled');
    },

    updateSelectedNodes: function () {
      var selectedNodes = this.selectedNodes;
      _.each(this.data.nodes, function (n) {
        if (n.id in selectedNodes) {
          n.prevColor = n.prevColor !== undefined ? n.prevColor : n.color;
          n.color = 8;
        } else n.color = n.prevColor !== undefined ? n.prevColor : n.color;
      });

      var updatedNodes = _.chain(selectedNodes).keys().union(_.keys(this.previous)).map(Number).value();
      this.canvas.update('nodes', updatedNodes).render();
      this.previous = selectedNodes;
    },

    updateColorings: function () { // random colors
      _.each(this.data.nodes, function (n) { n.color = Math.floor(Math.random() * 8); });
      this.canvas.data(this.data).render();
    },

    updateTransform: function () { this.canvas.transform(this.transform).render(); },

    toggleNetwork: function (e) {
      var networkData = $(e.currentTarget).attr('id') === 'small' ? smallNetwork : largeNetwork;
      this.render(networkData);
    },
  };
  grapher.initialize();
  return grapher;
};

$(document).ready(function () {
  var grapher = new webglGrapher();
  grapher.render(smallNetwork);
});