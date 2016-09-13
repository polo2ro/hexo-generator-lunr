'use strict';

const lunr    = require('lunr');
const pathFn  = require('path');
const moment  = require('moment');
const striptags = require('striptags');



module.exports = function(locals){
	let config = this.config,
		lunrConfig = config.lunr,
		field = (lunrConfig.field||'').trim(),
		lunrPath = lunrConfig.path,
		posts = [],
		pages = [],
		items,
		res = {"all":[]},
		year1;

	require('./../node_modules/lunr-languages/lunr.stemmer.support.js')(lunr);
	for (var i=0; i<lunrConfig.languages.length; i++) {
		if (lunrConfig.languages[i] !== 'en') {
			require('./../node_modules/lunr-languages/lunr.'+lunrConfig.languages[i]+'.js')(lunr);
		}
	}
	require('./../node_modules/lunr-languages/lunr.multi.js')(lunr);

	switch(field){
		case '':
		case 'post':
			posts = locals.posts.sort('-date');
			break;
		case 'page':
			pages = locals.pages;
			break;
		case 'all':
			posts = locals.posts.sort('-date');
			pages = locals.pages;
			break;
	}//switch
	items = posts.data.concat(pages.data);

	//grouping
	items.forEach(function(post){
	    if(post.date._isAMomentObject) {
            year1 = post.date.format('YYYY');
        } else {
		    year1 = moment(post.date).format('YYYY');
		}
		if(!res[year1]){
            res[year1] = [post];
        } else {
            res[year1].push(post);
        }
		res.all.push(post);
	});

	//indexing
	let finalData = [],
		searchIdx,
        store = {},
        tags,
        cates,
		bodyText;


	function addPostToStore(post) {
		tags = [];
		cates = [];
		if (post.tags) {
			post.tags.each(function(tag){
				tags.push(tag.name);
			});
		}
		if (post.categories) {
			post.categories.each(function(cate){
				cates.push(cate.name);
			});
		}
		bodyText = lunrConfig.fulltext ? striptags(post.content) : post.excerpt;
		let bodyStart = '';
		if (bodyText) {
			bodyStart = bodyText.substr(0,90)+'...';
		}

		searchIdx.add({
			title: post.title,
			desc: post.subtitle || "",
			body: bodyText || "",
			tags: tags.join(','),
			cates: cates.join(','),
			href: post.permalink
		});
		store[post.permalink] = {
			url: post.permalink,
			title: post.title,
			tags: tags,
			cates: cates,
			cover: post.cover,
			desc: post.subtitle || post.excerpt || bodyStart
		};

	}



	function indexBootstrap(){
		this.use(lunr.multiLanguage.apply(this, lunrConfig.languages));

		this.field('title', {boost:10});
		this.field('body');
		this.field('desc');
		this.field('tags', {boost:5});
		this.field('categories', {boost:5});
		this.ref('href');
	}



	for (var yearKey in res) {
		if (res.hasOwnProperty(yearKey)) {
			searchIdx = lunr(indexBootstrap);

			res[yearKey].forEach(addPostToStore);

			finalData.push({
				path: pathFn.join(lunrPath, yearKey + ".json"),
				data: JSON.stringify({
					index: searchIdx.toJSON(),
	                store: store
				})
			});

	        store = {};
		}
	}
	return finalData;
};
