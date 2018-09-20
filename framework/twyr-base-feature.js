/* eslint-disable security/detect-object-injection */

'use strict';

/**
 * Module dependencies, required for ALL Twyr modules
 * @ignore
 */

/**
 * Module dependencies, required for this module
 * @ignore
 */
const TwyrBaseModule = require('./twyr-base-module').TwyrBaseModule;
const TwyrFeatureError = require('./twyr-feature-error').TwyrFeatureError;

/**
 * @class   TwyrBaseFeature
 * @extends {TwyrBaseModule}
 * @classdesc The Twyr Web Application Server Base Class for all Features.
 *
 * @param   {TwyrBaseModule} [parent] - The parent module, if any.
 * @param   {TwyrModuleLoader} [loader] - The loader to be used for managing modules' lifecycle, if any.
 *
 * @description
 * Serves as the "base class" for all other features in the Twyr Web Application Server.
 *
 */
class TwyrBaseFeature extends TwyrBaseModule {
	// #region Constructor
	constructor(parent, loader) {
		super(parent, null);

		const TwyrFeatureLoader = require('./twyr-feature-loader').TwyrFeatureLoader;
		const actualLoader = (loader instanceof TwyrFeatureLoader) ? loader : new TwyrFeatureLoader(this);

		this.$loader = actualLoader;

		const inflection = require('inflection');
		const Router = require('koa-router');

		const inflectedName = inflection.transform(this.name, ['foreign_key', 'dasherize']).replace('-id', '');
		// this.$router = new Router({ 'prefix': `/${inflectedName}` });
		this.$router = new Router();

		// The RBAC Koa middleware
		this.$router.use(`/${inflectedName}`, this._doesUserHavePermission.bind(this));

		// The ABAC Koa middleware
		this.$router.use(`/${inflectedName}`, this._canUserAccessThisResource.bind(this));
	}
	// #endregion

	// #region Lifecycle hooks
	/**
	 * @async
	 * @function
	 * @override
	 * @instance
	 * @memberof TwyrBaseFeature
	 * @name     _setup
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Adds the Koa Router routes.
	 */
	async _setup() {
		try {
			await super._setup();
			await this._addRoutes();

			return null;
		}
		catch(err) {
			throw new TwyrFeatureError(`${this.name}::_setup error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @override
	 * @instance
	 * @memberof TwyrBaseFeature
	 * @name     _teardown
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Destroys the Koa Router routes.
	 */
	async _teardown() {
		try {
			await this._deleteRoutes();
			await super._teardown();

			return null;
		}
		catch(err) {
			throw new TwyrFeatureError(`${this.name}::_teardown error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrBaseFeature
	 * @name     _subModuleReconfigure
	 *
	 * @param    {TwyrBaseModule} subModule - The sub-module that changed configuration.
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Lets the module know that one of its subModules changed configuration.
	 */
	async _subModuleReconfigure(subModule) {
		await super._subModuleReconfigure(subModule);

		const subModuleType = Object.getPrototypeOf(Object.getPrototypeOf(subModule)).name;
		if((subModuleType !== 'TwyrBaseComponent') && (subModuleType !== 'TwyrBaseFeature'))
			return null;

		await this._deleteRoutes();
		await this._addRoutes();

		await this.$parent._subModuleReconfigure(this);
		return null;
	}
	// #endregion

	// #region API - to be overriden by derived classes, only if required
	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrBaseFeature
	 * @name     getClientsideAssets
	 *
	 * @param    {Object} ctxt - Koa context.
	 * @param    {Object} tenantFeatures - Sub-features allowed for this Tenant.
	 *
	 * @returns  {Object} Containing the compiled Ember.js client-side assets (specifically the route map, but could be others, as well).
	 *
	 * @summary  Returns the route map that is used by the Ember.js Router on the browser.
	 */
	async getClientsideAssets(ctxt, tenantFeatures) {
		const assets = this.EmberAssets;
		if(!assets) return null;

		const inflection = require('inflection');

		const featureNames = Object.keys(tenantFeatures || {});
		const clientsideAssets = {};

		for(let idx = 0; idx < featureNames.length; idx++) {
			const featureName = featureNames[idx];
			const feature = this.$features[featureName];

			const featureClientsideAssets = await feature.getClientsideAssets(ctxt, tenantFeatures[featureName]);
			if(!featureClientsideAssets) continue;

			Object.keys(featureClientsideAssets).forEach((featureClientsideAssetName) => {
				if(featureClientsideAssetName === 'RouteMap') {
					if(!clientsideAssets['RouteMap']) clientsideAssets['RouteMap'] = {
						'index': {
							'path': '/',
							'routes': {}
						}
					};

					const inflectedFeatureName = inflection.transform(featureName, ['foreign_key', 'dasherize']).replace('-id', '');
					clientsideAssets['RouteMap']['index']['routes'][inflectedFeatureName] = {
						'path': `/${inflectedFeatureName}`,
						'routes': featureClientsideAssets['RouteMap']
					};

					return;
				}

				if(!clientsideAssets[featureClientsideAssetName]) clientsideAssets[featureClientsideAssetName] = [];
				clientsideAssets[featureClientsideAssetName].push(featureClientsideAssets[featureClientsideAssetName]);
			});
		}

		Object.keys(clientsideAssets).forEach((clientsideAssetName) => {
			if(clientsideAssetName === 'RouteMap') return;
			clientsideAssets[clientsideAssetName] = clientsideAssets[clientsideAssetName].join('\n');
		});

		Object.keys(assets).forEach((assetName) => {
			if(assetName === 'RouteMap') {
				if(!assets['RouteMap']) assets['RouteMap'] = {
					'index': {
						'path': '/',
						'routes': ''
					}
				};

				assets['RouteMap']['index']['routes'] = clientsideAssets['RouteMap'] || '';
				return;
			}

			if(!assets[assetName]) assets[assetName] = [];
			assets[assetName].push(clientsideAssets[assetName]);
		});

		return assets;
	}
	// #endregion

	// #region Protected methods - need to be overriden by derived classes
	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrBaseFeature
	 * @name     getDashboardDisplayDetails
	 *
	 * @param    {Object} ctxt - Koa context.
	 *
	 * @returns  {Object} Dashboard display stuff for this Feature.
	 *
	 * @summary  Derived classes should return details, or null - depending on whether the user has the required permission(s).
	 */
	async getDashboardDisplayDetails(ctxt) { // eslint-disable-line no-unused-vars
		const inflection = require('inflection');

		const id = await this.$dependencies.ConfigurationService.getModuleID(this);
		const inflectedFeatureName = inflection.transform(this.name, ['foreign_key', 'dasherize']).replace('-id', '');

		return {
			'id': id,
			'type': 'dashboard/feature',

			'attributes': {
				'name': this.name,
				'type': 'feature',
				'route': inflectedFeatureName,
				'description': this.name,

				'icon_type': 'fa', // Other choices are img, paper, mdi
				'icon_path': 'laptop-code'
			}
		};
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrBaseFeature
	 * @name     _doesUserHavePermission
	 *
	 * @param    {Object} ctxt - Koa context.
	 * @param    {callback} next - Callback to pass the request on to the next route in the chain.
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Derived classes should call next, or throw a {TwyrFeatureError} - depending on whether the user has the required permission(s).
	 */
	async _doesUserHavePermission(ctxt, next) {
		await next();
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrBaseFeature
	 * @name     _canUserAccessThisResource
	 *
	 * @param    {Object} ctxt - Koa context.
	 * @param    {callback} next - Callback to pass the request on to the next route in the chain.
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Derived classes should call next, or throw a {TwyrFeatureError} - depending on whether the user can access this particular resource.
	 */
	async _canUserAccessThisResource(ctxt, next) {
		await next();
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrBaseFeature
	 * @name     _addRoutes
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Adds routes to the Koa Router.
	 */
	async _addRoutes() {
		if(twyrEnv === 'development' || twyrEnv === 'test') console.log(`${this.name}::_addRoutes`);

		// Add in the sub-components routes
		Object.keys(this.$components || {}).forEach((componentName) => {
			const componentRouter = this.$components[componentName].Router;
			this.$router.use(componentRouter.routes());
		});

		// Add in the sub-features routes
		Object.keys(this.$features || {}).forEach((featureName) => {
			const featureRouter = this.$features[featureName].Router;
			this.$router.use(featureRouter.routes());
		});

		return null;
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrBaseFeature
	 * @name     _deleteRoutes
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Removes all the routes from the Koa Router.
	 */
	async _deleteRoutes() {
		if(twyrEnv === 'development' || twyrEnv === 'test') console.log(`${this.name}::_deleteRoutes`);

		// NOTICE: Undocumented koa-router data structure.
		// Be careful upgrading :-)
		if(this.$router) this.$router.stack.length = 0;
		return null;
	}
	// #endregion

	// #region Properties
	/**
	 * @member   {Object} Router
	 * @instance
	 * @memberof TwyrBaseFeature
	 *
	 * @readonly
	 */
	get Router() {
		return this.$router;
	}

	/**
	 * @member   {Object} EmberAssets
	 * @instance
	 * @memberof TwyrBaseFeature
	 *
	 * @readonly
	 */
	get EmberAssets() {
		return {
			'RouteMap': {
				'index': {
					'path': '/',
					'routes': ''
				}
			}
		};
	}

	/**
	 * @override
	 */
	get dependencies() {
		return ['*'].concat(super.dependencies);
	}

	/**
	 * @override
	 */
	get basePath() {
		return __dirname;
	}
	// #endregion
}

exports.TwyrBaseFeature = TwyrBaseFeature;