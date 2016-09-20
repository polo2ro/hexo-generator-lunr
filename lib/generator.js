'use strict';

const lunr    = require('lunr');
const pathFn  = require('path');
const striptags = require('striptags');
const hsplit  = require('hsplit');


function extractTitleNode(section) {

	let id = null;
	let title = null;
	let removePos = null;

	for (let i=0; i<section.childNodes.length; i++) {
		if (section.childNodes[i].nodeType !== 1) {
			continue;
		}

		if (section.childNodes[i].nodeName.match(/H[1-6]/)) {
			removePos = i;
			title = section.childNodes[i].textContent;
			id =  section.childNodes[i].getAttribute('id');
		}

		break;
	}

	if (null !== removePos) {
		section.childNodes[removePos].remove();
	}

	return {
		id: id,
		title: title
	};
}



module.exports = function(locals){
	let config = this.config,
		lunrConfig = config.lunr,
		field = (lunrConfig.field||'').trim(),
		lunrPath = lunrConfig.path,
		posts = [],
		pages = [],
		items;

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


	//indexing
	let finalData = [],
		searchIdx,
        store = {},
        tags,
        cates,
		bodyText,
		title,
		url;


	/**
	 * @return {Promise}
	 */
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

		return hsplit.document(post.content)
		.then(article => {
			if (null === article) {
				// do not index non article pages
				console.warn('ignored post: '+post.title);
				return;
			}

			title = post.title;
			bodyText = striptags(post.content);

			let bodyStart = '';
			if (bodyText) {
				bodyStart = bodyText.substr(0,90)+'...';
			}


			let sections = article.getElementsByTagName('section');

			for (let i=0; i<sections.length; i++) {
				let sectionTitle = extractTitleNode(sections[i]);

				if (null !== sectionTitle.title) {
					title = sectionTitle.title;
				}

				bodyText = sections[i].textContent;
				url = post.permalink;

				if (null !== sectionTitle.id) {
					url += '#'+sectionTitle.id;
				}

				searchIdx.add({
					title: title,
					desc: post.subtitle || "",
					body: bodyText || "",
					tags: tags.join(','),
					cates: cates.join(','),
					href: url
				});

				store[url] = {
					url: url,
					title: title,
					tags: tags,
					cates: cates,
					cover: post.cover,
					desc: post.subtitle || post.excerpt || bodyStart
				};
			}

			return post;

		});
	}



	function indexBootstrap() {
		this.use(lunr.multiLanguage.apply(this, lunrConfig.languages));

		this.field('title', {boost:10});
		this.field('body');
		this.field('desc');
		this.field('tags', {boost:5});
		this.field('categories', {boost:5});
		this.ref('href');
	}




	searchIdx = lunr(indexBootstrap);

	let promises = [];
	items.forEach(post => {
		promises.push(addPostToStore(post));
	});

	return Promise.all(promises)
	.then(() => {
		finalData.push({
			path: pathFn.join(lunrPath, "all.json"),
			data: JSON.stringify({
				index: searchIdx.toJSON(),
	            store: store
			})
		});

		return finalData;
	});
};
