// Shoot sidebar: "Cover link" URL field (custom hyperlink per cover).
// ponytail: 25 lines here instead of an ACF dependency; empty = shoot page.
(function () {
  var el = wp.element.createElement;
  var TextControl = wp.components.TextControl;
  var PluginDocumentSettingPanel = wp.editPost.PluginDocumentSettingPanel;
  var useEntityProp = wp.data.useEntityProp || wp.coreData.useEntityProp;
  var select = wp.data.select;

  function Panel() {
    var postType = select('core/editor').getCurrentPostType();
    if (postType !== 'shoot') return null;
    var postId = select('core/editor').getCurrentPostId();
    var record = useEntityProp('postType', 'shoot', 'meta', postId);
    var meta = record[0] || {};
    var setMeta = record[1];
    return el(
      PluginDocumentSettingPanel,
      { name: 'shoot-cover-link', title: 'Cover link', className: 'shoot-cover-link' },
      el(TextControl, {
        label: 'Custom URL (empty = shoot page)',
        placeholder: 'https://…',
        value: meta._shoot_link || '',
        onChange: function (v) { setMeta({ _shoot_link: v }); },
      })
    );
  }

  wp.plugins.registerPlugin('shoot-cover-link', { render: Panel });
})();
