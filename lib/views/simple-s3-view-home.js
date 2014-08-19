Template.simpleS3ViewHome.created = function () {
	Session.setDefault('simple-s3__bucket-items', false);
	Session.setDefault('showImagePreivews', false);
	SimpleS3.updateBucketList();
};

Template.simpleS3ViewHome.helpers({
	previews: function () {
		return Session.get('showImagePreivews');
	},
	isImageAndPreview: function () {
		return (/\.(gif|jpg|jpeg|png)$/i).test(this.Key) && Session.get('showImagePreivews');
	},
	fileExtension: function () {
		var regexPatt = /\.([0-9a-z]+)(?:[\?#]|$)/i;
		return (this.Key).match(regexPatt)[1];
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