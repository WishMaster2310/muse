var m_site = {
	newElemName: ko.observable(''),
	isFixture: ko.observable(),
	fragments: ko.observableArray(),
	pages: ko.observableArray(),
	images: ko.observableArray(),
	activeGroup: ko.observable(),
	activeTab: ko.observable('fragments'),
	addNewElem: function(d) {
		var obj = {
			group: d,
			name: m_site.newElemName()
		};

		if (m_site.isFixture()) {
			obj.fixture = true
		};

		if (m_site.newElemName().trim().length < 1) {
			alert('Заполни Имя');
			return;
		};

		$.ajax({
			method: 'GET',
			data: obj,
			url: '/sitemuse/addPage'
		}).done(function(data) {
			
			if (data.error) {
				alert(d.error);
				return
			};

			loadItems ();
			$.arcticmodal('close');
			m_site.newElemName('');

			if (d === 'fragment') {
				m_site.activeTab('fragments')
			} else if (d === 'page')  {
				m_site.activeTab('pages')
			}
		})
	},
	removeElem: function(m, d) {
		var obj = {
			group: m,
		 	name: d
		};

		$.ajax({
			method: 'GET',
			data: obj,
			url: '/sitemuse/deletePage'
		}).done(function(d) {

			if (d.error) {
				alert(d.error);
				return
			};

			loadItems ();
		})
	},

	updmsid: function(d, m) {
		var item = ko.toJS(d);

		if (!!item.msid) {
			item._mod = m;
			console.log(item)

			$.ajax({
				method: 'GET',
				data: item,
				url: '/sitemuse/updateItem'
			}).done(function(d) {

				loadItems ();
			});

		} else {
			alert('Name is required')
		}
	},
	uploadFiles:function() {
		 //var formData = new FormData($('this'));
	},
	removeImage: function(d){

		var item = {
			path: d.path
		};

		m_site.images.remove(d)
		$.ajax({
			method: 'GET',
			data: item,
			url: '/sitemuse/removeImage'
		}).done(function(d) {

		});
	}
}

ko.bindingHandlers.modal = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
    	var target = $(valueAccessor());
    	var options = allBindingsAccessor.get('modalOptions') || {};


    	$(element).on('click', function(e) {
    		e.preventDefault();
    		target.arcticmodal(options);
    	})
    }
};

function loadItems () {
	var url= "/sitemuse/getmapping";
	$.getJSON(url, function(data) {
		
		console.log(data)
		// tmp arrays
		var _pages = [], _frags = [], _images = [];
		
		_.forEach(data.pages, function(n) {
			n.msid = ko.observable(n.msid);
			_pages.push(n)
		});

		_.forEach(data.fragments, function(n) {
			n.msid = ko.observable(n.msid);
			_frags.push(n)
		});

		_.forEach(data.images, function(n) {
			n.msid = ko.observable(n.msid);
			_images.push(n)
		});

		m_site.pages(_pages);
		m_site.fragments(_frags);
		m_site.images(_images);
	});
};

$(document).ready(function() {

	ko.applyBindings('m_site');
	loadItems ();
});