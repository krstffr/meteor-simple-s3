Template.simpleS3ViewHome.created = function () {
	Session.setDefault('simple-s3__bucket-items', false);
	Session.setDefault('showImagePreivews', false);
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
	folder: function () {
		return this.Key.substring(0, this.Key.lastIndexOf('/')) + '/';
	},
	filename: function () {
		return this.Key.split("/").pop();
	},
	sizeInKb: function () {
		return Math.floor( this.Size / 10 ) / 100;
	},
	previews: function () {
		return Session.get('showImagePreivews');
	},
	isImageAndPreview: function () {
		return (/\.(gif|jpg|jpeg|png)$/i).test(this.Key) && Session.get('showImagePreivews');
	},
	fileExtension: function () {
		var regexPatt = /\.([0-9a-z]+)(?:[\?#]|$)/i;
		var match = (this.Key).match(regexPatt);
		if (match)
			return '.'+match[1];
		return '/';
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
	'click .simple-s3__delete-file': function () {
		if (!confirm('You really want to delete this file?'))
			return ;
		SimpleS3.fileDelete( this.Key );
	},
	'click .simple-s3__update-list': function () {
		SimpleS3.updateBucketList();
	},
	'click .simple-s3__show-image-previews': function () {
		Session.set('showImagePreivews', !Session.get('showImagePreivews') );
	}
});