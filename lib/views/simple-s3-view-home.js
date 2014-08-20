Template.simpleS3ViewHome.created = function () {
	Session.setDefault('simple-s3__bucket-items', false);
	Session.setDefault('simple-s3__bucket-items-list', {});
	Session.setDefault('simple-s3__show-image-previews', false);

	SimpleS3.updateBucketList();
	
	// Set the title of the page
	$('title').text('Simple S3 – Easily do light stuff to your AWS S3 buckets.');
};

Template.simpleS3ViewHome.helpers({
	bucketItemButtons: function () {
		var buttons = [
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
		];
		return buttons;
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
		return _.filter(Session.get('simple-s3__bucket-items').Contents, function( bucketItem ){
			// Don't return the ones which are in the thrash!
			return !(/thrash/i).test( bucketItem.Key );
		});
	}
});

Template.simpleS3ViewHome.events({
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