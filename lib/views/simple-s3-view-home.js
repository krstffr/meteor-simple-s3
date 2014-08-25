Template.simpleS3ViewHome.created = function () {
	Session.setDefault('simple-s3__show-upload-form', false);
	Session.setDefault('simple-s3__show-create-folder-form', false);
	Session.setDefault('simple-s3__bucket-items', false);
	Session.setDefault('simple-s3__bucket-items-list', {});
	Session.setDefault('simple-s3__show-image-previews', false);
	Session.setDefault('filter', { Directory: '/' });
	Session.setDefault('simple-s3__current-bucket-items', false);
	Session.setDefault('simple-s3__files-movable', false);
	Session.setDefault('simple-s3__files-movable__current-moving-file', false);
	Session.setDefault('simple-s3__ui-enabled', true);

	SimpleS3.loading.stop();
	SimpleS3.updateBucketList();
	
	// Set the title of the page
	$('title').text('Simple S3 – Easily do light stuff to your AWS S3 buckets.');
};

Template.simpleS3ViewHome.helpers({
	Directory: function () {
		if (this.Filename === '')
			return '/'+this.Key;
		return '';
	},
	disabledUI: function () {
		if ( !SimpleS3.ui.enabledStatus() )
			return 'simple-s3__bucket-items--disabled';
		return ;
	},
	movingClasses: function () {

		if (!Session.get('simple-s3__files-movable'))
			return ;

		var classesToReturn = 'simple-s3__bucket-item--hide-buttons';

		// For files which are moveable. No file is currently selected.
		if (!Session.get('simple-s3__files-movable__current-moving-file'))
			return classesToReturn + ' simple-s3__bucket-item--movable';

		// This file is selected and is about to be moved.
		if (Session.get('simple-s3__files-movable__current-moving-file') === this.Key)
			return classesToReturn + ' simple-s3__bucket-item--to-be-moved';

		// A file is selected to be moved, and this is a folder.
		if (Session.get('simple-s3__files-movable__current-moving-file') &&
			this.Filename === '')
			return classesToReturn + ' simple-s3__bucket-item--folder-is-taking-moving-files';

		// A file is selected to be moved, and it's not this one (so this file is disabled)
		if (Session.get('simple-s3__files-movable__current-moving-file') !== this.Key)
			return classesToReturn + ' simple-s3__bucket-item--not-the-file-to-be-moved';

	},
	isMovable: function () {
		return Session.get('simple-s3__files-movable') && !Session.get('simple-s3__files-movable__current-moving-file');
	},
	isFile: function () {
		return this.Filename !== '';
	},
	isCurrentSortOrder: function () {
		return this.sortBy === SimpleS3.getCurrentSortOrder().sortBy;
	},
	currentDir: function ( getWhat ) {
		if (!Session.get('simple-s3__current-bucket-items'))
			return 0;
		var currentBucketItems = Session.get('simple-s3__current-bucket-items');
		if (getWhat === 'numberOfFiles')
			return currentBucketItems.length;
		if (getWhat === 'totalSize')
			return Math.floor(_.reduce(currentBucketItems, function(memo, item){ return memo + item.Size; }, 0) / 10 ) / 100;
	},
	errorMessage: function () {
		return SimpleS3.errorMessages.getCurrent();
	},
	loadingMessage: function () {
		return SimpleS3.loading.getMessage();
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
			prevLink = prevLink + link;
			return toReturn;
		});
		// Also add the / link as well at the beginning of the array.
		dirFilterLinks.unshift({ link: '/', linkName: 'home' });
		return dirFilterLinks;
	},
	buttons: function ( buttonsKey, context ) {
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
			},
			{
				buttonText: 'Move file',
				cssClass: 'simple-s3__toggle-move-files'
			}
			],
			bucketListItem: [
			{
				buttonText: 'Copy URL',
				cssClass: 'simple-s3__get-url',
				filters: {
					exists: ['Filename']
				}
			},
			{
				buttonText: 'Rename',
				cssClass: 'simple-s3__rename-file',
				filters: {
					exists: ['Filename']
				}
			},
			{
				buttonText: 'Move',
				cssClass: 'simple-s3__move-file',
				filters: {
					exists: ['Filename']
				}
			},
			{
				buttonText: 'Delete',
				cssClass: 'simple-s3__delete-file'
			}
			]
		};
		// This is for adding the key to the button.
		// For use when using the key!
		if (context) {
			buttons[buttonsKey] = _(buttons[buttonsKey]).map( function( button ) {
				var toReturn = button;
				toReturn.key = context.Key;
				toReturn.directory = context.Directory;
				toReturn.filename = context.Filename;
				if (toReturn.filters) {
					if (toReturn.filters.exists) {
						_.each(toReturn.filters.exists, function( existsKey ){
							if (context[existsKey] === '')
								toReturn = false;
						});
					}
				}
				return toReturn;
			});
		}
		return _( buttons[buttonsKey] ).compact();
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
		Session.set('simple-s3__current-bucket-items', bucketItems);
		if (bucketItems.length < 1)
			bucketItems = [{ emptyMessage: 'No files… yet.' }];
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
	'click .simple-s3__move-file': function () {
		SimpleS3.file.moveToggle();
		SimpleS3.file.moveSelectFile( this.key );
	},
	'click .simple-s3__bucket-item--folder-is-taking-moving-files': function () {
		if (!Session.get('simple-s3__files-movable__current-moving-file'))
			return SimpleS3.file.moveReset();
		return SimpleS3.file.move( Session.get('simple-s3__files-movable__current-moving-file'), this.Key );
	},
	'click .simple-s3__bucket-item--file.simple-s3__bucket-item--movable': function ( e ) {
		SimpleS3.file.moveSelectFile( this.Key );
	},
	'click .simple-s3__toggle-move-files': function () {
		SimpleS3.file.moveToggle();
	},
	'click .simple-s3__rename-file': function ( e ) {
		var currentFileName = SimpleS3.getFileName( this.key );
		var newFileName = prompt('Select a new filename.', currentFileName);
		if (!newFileName || currentFileName === newFileName )
			return ;
		SimpleS3.file.rename( this.key, currentFileName, newFileName );
	},
	'click .simple-s3__get-url': function ( e ) {
		window.prompt(
			"Copy the link below.",
			'http://'+Session.get('simple-s3__bucket-items').Name+'.s3.amazonaws.com/'+this.key
			);
	},
	'submit .simple-s3__upload-form': function ( e, tmpl ) {
		e.preventDefault();
		var fileInput = tmpl.find('.simple-s3__upload-form__file');
		SimpleS3.file.handleUpload( fileInput );
	},
	'submit .simple-s3__create-folder-form': function ( e, tmpl ) {
		e.preventDefault();
		var folderName = $(tmpl.find('.simple-s3__create-folder-form__folder-name')).val();
		SimpleS3.folder.create( folderName );
	},
	'click .simple-s3__headline__folder-filter-link': function ( e, tmpl ) {
		return SimpleS3.filter.set( 'Directory', this.link );
	},
	'click .simple-s3__bucket-item__filter-directory-link': function ( e, tmpl ) {
		var folderName = '/'+this.Key;
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
		Session.set('simple-s3__show-upload-form', false );
		Session.set('simple-s3__show-create-folder-form', !Session.get('simple-s3__show-create-folder-form') );
		Meteor.setTimeout(function () {
			$('.simple-s3__create-folder-form__folder-name').focus();
		}, 1);
	},
	'click .simple-s3__upload-file': function ( e, tmpl ) {
		Session.set('simple-s3__show-create-folder-form', false );
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
		if (!this.filename)
			return SimpleS3.folder.delete( this.key );
		return SimpleS3.file.delete( this.key );
	},
	'click .simple-s3__update-list': function () {
		SimpleS3.updateBucketList();
	},
	'click .simple-s3__show-image-previews': function () {
		Session.set('simple-s3__show-image-previews', !Session.get('simple-s3__show-image-previews') );
	}
});