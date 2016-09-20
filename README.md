# hexo-generator-lunr
Lunr index generator plugin for Hexo.

This fork is based on the default lunr, and use a multi language configuration with the lunr-languages package



## How to use

In your `_config.yml`, add the following configs.

```
# lunr
## languages - array of languages supported by [lunr-languages](https://github.com/MihaiValentin/lunr-languages)
## field - post | page | all, default is post
## path - where should lunr put it's indexed data
lunr:
  languages: [en, fr]
  field: all
  fulltext: true
  path: assets/lunr/
```

The generator will build indexes to use in your site /assets/lunr/all.json.
the json files contain two properties :

* index: the serialized lunr index
* store: all indexed data, a result from a search index can be retrived from this object to get the title, url, description of the item.

The lunr index have to be restored client side after loading the correct javascrit files, here is an example :

* lunr.js/lunr.min.js
* lunr-languages/lunr.stemmer.support.js
* lunr-languages/lunr.fr.js
* lunr-languages/lunr.multi.js

then the index is restored with this code :

```

function downloadJSONFile() {
    return $http.get('/assets/lunr/all.json').then(function(response) {

        lunr.multiLanguage('en', 'fr');

        return {
            index: lunr.Index.load(response.data.index),
            store: response.data.store
        };
    });
}

```

Then a search query can be done based on this resource :

```
var refs = lunrResource.index.search(q);
var results = [];
for (var i=0; i<refs.length; i++) {
    results.push(lunrResource.store[refs[i].ref]);
}
```

## About Lunr.js

> Simple full-text search in your browser

For more details about Lunr.js, please check out the [Lunr.js](http://lunrjs.com/) official site.
