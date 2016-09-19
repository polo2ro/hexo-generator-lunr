/* global hexo */
'use strict';

const assign = require('object-assign');

hexo.config.lunr = assign({
    languages: ['en'],
  	field: 'all',
	path: 'assets/lunr/'
}, hexo.config.lunr);

hexo.extend.generator.register('lunr', require('./lib/generator'));
