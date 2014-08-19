Template.simpleS3ViewHome.created = function () {
	Session.setDefault('simple-s3__bucket-items', false);
	SimpleS3.updateBucketList();
};

Template.simpleS3ViewHome.helpers({
	isImage: function () {
		return (/\.(gif|jpg|jpeg|png)$/i).test(this.Key);
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
	}
});