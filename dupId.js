/*****************************************************************************
 *
 *  KO dupId binding handler
 *
 *  Purpose
 *  -------
 *  Produce a unique id for use as an html id attribute, such that components
 *  can be reused without id conflicts. More specfically, this allows the
 *  *same* unique id to be produced multiple times (default twice) for the
 *  purpose of pairing inputs with labels ("id" and "for" attribute), or any
 *  number of times for adding multiple labels.
 *
 *  dupId and dupFor are identical, save for the html attribute that they set
 *
 *  Usage:
 *  <input data-bind="dupId: {}">
 *  <label data-bind="dupFor: {}">The Label</label>
 *
 *  Specify a prefix to allow alternation:
 *  <table>
 *    <tr>
 *      <td><label data-bind="dupFor: 'r1'">Radio 1</label></td>
 *      <td><label data-bind="dupFor: 'r2'">Radio 2</label></td>
 *    </tr>
 *    <tr>
 *      <td><input type="radio" name="thename" data-bind="dupId: 'r1'""></td>
 *      <td><input type="radio" name="thename" data-bind="dupId: 'r2'""></td>
 *    </tr>
 *  </table>
 *
 *  Parameters:
 *  'string' - a string literal: shorthand for the 'prefix' parameter
 *  <int>    - a number literal: shorthand for the 'count' parameter
 *  {}       - empty, will generate a unique id string every 2nd invocation
 *  'prefix': 'string', will generate a unique id string with the given prefix
 *             this is primarily for code readibility, but in addition this
 *             allows the repeated ids to be called out of sequence
 *             eg for inputs and labels in columns.
 *             Both prefixed and non-prefixed can be called out of sequence.
 *             It can only track one non-prefixed id at a time, of course.
 *  'clear': true, will ensure any incompletely requested ids are discarded
 *             prefixed or not.
 *  'count': <int>, will produce the same id this number of times
 *  'attr': 'string', this specifies which html attribute to set on this
 *             invocation, overriding the default.
 *
 *  Note: only 'count' and 'prefix' parameters may be an observable, and they
 *  are only evaluated once when first creating their element.
 *
 *  'count' is only used the first time for each prefix, it is ignored for
 *  the remaining iterations. For non-prefixed, it is ignored until the
 *  previous "first" invocation has been exhausted at which point it will
 *  generate a new id with a default count of 2 or whatever 'count' is
 *  specified at that subsequent invocation.
 *
 *  Interaction with an overlapping attr binding handler is undefined.
 *
 ****************************************************************************/
define(function(require) {
	'use strict';

	function dupId(ko, attr, bhName) {
		attr   = attr   || 'id';
		bhName = bhName || 'dupId';
		return {
			init: function(element, valueAccessor) {
				return dupId_init(ko, attr, bhName, element, valueAccessor);
			}
		};
	}
	function dupFor(ko) {
		return dupId(ko, 'for', 'dupFor');
	}

	function dupId_init(ko, attr, bhName, element, valueAccessor) {
		var _prefix = '_';
		var duped_id = null; // [ id, count ]
		var params = ko.utils.unwrapObservable(valueAccessor());
		var options = {
			'attr': attr,
			'count': 2,
			'clear': false,
			'prefix': ""
		};
		if (typeof params === 'string') { // prefix
			options.prefix = params;
		} else if (typeof params === 'number') {
			options.count = params;
		} else if (params !== null && typeof params === 'object') {
			options.attr   = ('attr'   in params) ? params.attr   : options.attr;
			options.count  = ('count'  in params) ? params.count  : options.count;
			options.prefix = ('prefix' in params) ? params.prefix : options.prefix;
			options.clear  = ('clear'  in params) ? params.clear  : options.clear;

			options.count  = ko.utils.unwrapObservable(options.count);
			options.prefix = ko.utils.unwrapObservable(options.prefix);
		}
		if (typeof options.attr !== 'string' ||
		    -1 === ['id', 'for', 'name'].indexOf(options.attr))
		{
			throw new Error("ko.bindingHandlers." + bhName + ": invalid attr: " + options.attr);
		}
		if (typeof options.count !== 'number' ||
		    Math.floor(options.count) !== options.count ||
		    options.count <= 0)
		{
			throw new Error("ko.bindingHandlers." + bhName + ": invalid count, got: " + options.count);
		}
		if (options.prefix && typeof options.prefix !== 'string') {
			throw new Error("ko.bindingHandlers." + bhName + ": invalid prefix, expecting string, got: " + options.prefix);
		}
		if (typeof options.clear !== 'boolean') {
			throw new Error("ko.bindingHandlers." + bhName + ": invalid clear, expecting boolean, got: " + options.clear);
		}
		if (options.clear) {
			ids = {};
		}
		
		_prefix += options.prefix;
		if (_prefix in ids) { // already called before
			duped_id = ids[_prefix];
			if (--duped_id[1] <= 0) { // done, remove it
				delete ids[_prefix];
			}
			if (options.prefix && duped_id[1] < 0) { // only a problem for explicitly prefixed
				throw new Error("ko.bindingHandlers." + bhName + ": called too many times for '" + options.prefix + "'");
			}
		} else { // new invocation
			duped_id = [ generateId(), options.count - 1, false ];
			ids[_prefix] = duped_id;
		}
		if (options.attr === 'id') {
			if (duped_id[2]) {
				throw new Error("ko.bindingHandlers." + bhName + ": called twice on id attribute");
			}
			duped_id[2] = true;
		}
		element.setAttribute(options.attr, options.prefix + duped_id[0]);
	}

	/*
	 *  ids is { "_<prefix>": [ id, count, <bool: id-attr-set-already> ] }
	 *  all keys are internally prefixed with "_", thus non-prefix is just "_" entry
	 */
	var ids = {};
	//var last_id = 0; // if we wanted to just increment
	function generateId() { // random 6-char string
		var letters      = [];
		var possible     = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
		var possible_len = possible.length;
		var id_length    = 6;
		while (0 < id_length--) {
			letters.push(possible.charAt(Math.floor(Math.random() * possible_len)));
		}
		return letters.join("");
		//return String(Math.floor(Math.random() * 1000000)); // 10-based, not 0-padded
	}

	return function(ko) {
		var kbh = ko.bindingHandlers;
		kbh.dupId   = kbh.dupId  || dupId(ko);
		kbh.dupFor  = kbh.dupFor || dupFor(ko);
	};
});
