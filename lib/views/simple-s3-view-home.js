Template.simpleS3ViewHome.created = function () {
	Session.setDefault('simple-s3__show-upload-form', false);
	Session.setDefault('simple-s3__show-create-folder-form', false);
	Session.setDefault('simple-s3__bucket-items', false);
	Session.setDefault('simple-s3__bucket-items-list', {});
	Session.setDefault('simple-s3__show-image-previews', false);
	Session.setDefault('filter', { Directory: '/' });

	SimpleS3.loading.stop();
	SimpleS3.updateBucketList();
	
	// Set the title of the page
	$('title').text('Simple S3 – Easily do light stuff to your AWS S3 buckets.');
};

Template.simpleS3ViewHome.helpers({
	errorMessage: function () {
		return SimpleS3.errorMessages.getCurrent();
	},
	isLoading: function () {
		return SimpleS3.loading.getStatus();
	},
	filteredFoldersLinks: function () {
		// Get the filtered directories
		var filteredDirectories = SimpleS3.filter.get('Directory');
		// Get them into an array
		directories = filteredDirectories.match(/([^/.]+)/g);
		// So init this one to nothing at first
		var prevLink = '';
		// Map over them, adding the previous link to the beginning
		// of the new link.
		dirFilterLinks = _(directories).map( function( directory ) {
			var link = '/' + directory;
			var toReturn = { link: prevLink + link + '/', linkName: directory };
			prevLink = link;
			return toReturn;
		});
		// Also add the / link as well at the beginning of the array.
		dirFilterLinks.unshift({ link: '/', linkName: 'home' });
		return dirFilterLinks;
	},
	buttons: function ( buttonsKey ) {
		var buttons =
		{
			main: [
			{
				buttonText: 'Upload file',
				cssClass: 'simple-s3__upload-file'
			},
			{
				buttonText: 'Create folder',
				cssClass: 'simple-s3__create-folder'
			},
			{
				buttonText: 'Update the list',
				cssClass: 'simple-s3__update-list'
			},
			{
				buttonText: 'Toggle image previews',
				cssClass: 'simple-s3__show-image-previews'
			}
			],
			bucketListItem: [
			{
				buttonText: 'Move'
			},
			{
				buttonText: 'Rename'
			},
			{
				buttonText: 'Delete',
				cssClass: 'simple-s3__delete-file'
			}
			]
		};
		return buttons[buttonsKey];
	},
	sortButtons: function () {
		var sortBys = [
		{ sortBy: 'Filename' },
		{ sortBy: 'Size' },
		{ sortBy: 'FileExtension' }
		];
		return sortBys;
	},
	sizeInKb: function () {
		return Math.floor( this.Size / 10 ) / 100;
	},
	previews: function () {
		return Session.get('simple-s3__show-image-previews');
	},
	isImageAndPreview: function () {
		return (/\.(gif|jpg|jpeg|png)$/i).test(this.Key) && Session.get('simple-s3__show-image-previews');
	},
	bucketName: function () {
		return Session.get('simple-s3__bucket-items').Name;
	},
	bucketItems: function () {
		var bucketItems = SimpleS3.filter.filterCurrentBucket();
		if (bucketItems.length < 1)
			bucketItems = [{ emptyMessage: 'No files… yet.'}];
		return bucketItems;
	},
	showUploadForm: function () {
		return Session.get('simple-s3__show-upload-form');
	},
	showCreateFolderForm: function () {
		return Session.get('simple-s3__show-create-folder-form');
	},
	filter: function ( key ) {
		return SimpleS3.filter.get( key );
	}
});

Template.simpleS3ViewHome.events({
	'submit .simple-s3__upload-form': function ( e, tmpl ) {
		e.preventDefault();
		var fileInput = tmpl.find('.simple-s3__upload-form__file');
		SimpleS3.fileUpload( fileInput );
	},
	'submit .simple-s3__create-folder-form': function ( e, tmpl ) {
		e.preventDefault();
		var folderName = $(tmpl.find('.simple-s3__create-folder-form__folder-name')).val();
		SimpleS3.folderCreate( folderName );
	},
	'click .simple-s3__headline__folder-filter-link': function ( e, tmpl ) {
		var folderName = $(e.currentTarget).data('filter-dir');
		return SimpleS3.filter.set( 'Directory', folderName );
	},
	'click .simple-s3__bucket-item__filter-directory-link': function ( e, tmpl ) {
		var folderName = $(e.currentTarget).text();
		return SimpleS3.filter.set( 'Directory', folderName );
	},
	'click .simple-s3__bucket-item__file-extension': function ( e, tmpl ) {
		var fileExtension = $(e.currentTarget).text();
		return SimpleS3.filter.set( 'FileExtension', fileExtension );
	},
	'click .simple-s3__headline__file-extension-filtered': function () {
		return SimpleS3.filter.reset( 'FileExtension' );
	},
	'click .simple-s3__create-folder': function ( e, tmpl ) {
		Session.set('simple-s3__show-create-folder-form', !Session.get('simple-s3__show-create-folder-form') );
	},
	'click .simple-s3__upload-file': function ( e, tmpl ) {
		Session.set('simple-s3__show-upload-form', !Session.get('simple-s3__show-upload-form') );
	},
	'click .simple-s3__sort-by-button': function ( e, tmpl ) {
		var clickedBtn = $(e.currentTarget);
		var newSortBy = clickedBtn.data('sortBy');
		SimpleS3.setSortOrderOfBucketList( newSortBy );
	},
	'click .simple-s3__delete-file': function ( e, tmpl ) {
		if (!confirm('You really want to delete this file?'))
			return ;
		var clickedBtn = $(e.currentTarget);
		var key = clickedBtn.data('key');
		SimpleS3.fileDelete( key );
	},
	'click .simple-s3__update-list': function () {
		SimpleS3.updateBucketList();
	},
	'click .simple-s3__show-image-previews': function () {
		Session.set('simple-s3__show-image-previews', !Session.get('simple-s3__show-image-previews') );
	}
});