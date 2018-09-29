'use strict';

/**
 * Module dependencies, required for ALL Twyr' modules
 * @ignore
 */

/**
 * Module dependencies, required for this module
 * @ignore
 */
const TwyrBaseFeature = require('twyr-base-feature').TwyrBaseFeature;
const TwyrFeatureError = require('twyr-feature-error').TwyrFeatureError;

/**
 * @class   ServerAdministration
 * @extends {TwyrBaseFeature}
 * @classdesc The Twyr Web Application Server ServerAdministration feature - manages server settings.
 *
 *
 */
class ServerAdministration extends TwyrBaseFeature {
	// #region Constructor
	constructor(parent, loader) {
		super(parent, loader);
	}
	// #endregion

	// #region Protected methods - need to be overriden by derived classes
	/**
	 * @async
	 * @function
	 * @override
	 * @instance
	 * @memberof ServerAdministration
	 * @name     getDashboardDisplayDetails
	 *
	 * @param    {Object} ctxt - Koa context.
	 *
	 * @returns  {Object} Dashboard display stuff for this Feature.
	 *
	 * @summary  Everyone logged-in gets access.
	 */
	async getDashboardDisplayDetails(ctxt) {
		const defaultDisplay = await super.getDashboardDisplayDetails(ctxt);

		defaultDisplay['attributes']['description'] = `Edit Server Settings`;
		defaultDisplay['attributes']['icon_type'] = 'mdi';
		defaultDisplay['attributes']['icon_path'] = 'server';

		return null;
	}

	/**
	 * @async
	 * @function
	 * @override
	 * @instance
	 * @memberof ServerAdministration
	 * @name     _doesUserHavePermission
	 *
	 * @param    {Object} ctxt - Koa context.
	 * @param    {callback} next - Callback to pass the request on to the next route in the chain.
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Only the super-administrators get access.
	 */
	async _doesUserHavePermission(ctxt, next) {
		if(ctxt.state.user) {
			await next();
			return;
		}

		throw new TwyrFeatureError('No active session');
	}

	/**
	 * @async
	 * @function
	 * @override
	 * @instance
	 * @memberof ServerAdministration
	 * @name     _canUserAccessThisResource
	 *
	 * @param    {Object} ctxt - Koa context.
	 * @param    {callback} next - Callback to pass the request on to the next route in the chain.
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Only the super-administrators get access.
	 */
	async _canUserAccessThisResource(ctxt, next) {
		if(ctxt.state.user) {
			await next();
			return;
		}

		throw new TwyrFeatureError('No active session');
	}
	// #endregion

	// #region Properties
	/**
	 * @override
	 */
	get basePath() {
		return __dirname;
	}
	// #endregion
}

exports.feature = ServerAdministration;