<?php


	if(!defined('_PS_VERSION_'))
	{
		exit;
	}

	class Postcodecheckout extends Module
	{
		protected $_html = '';
		protected $_postErrors = array();

		public function __construct()
		{
			$this->name = 'postcodecheckout';
			$this->tab = 'checkout';
			$this->version = '1.0.1';
			$this->author = 'Postcode Checkout';
			$this->need_instance = 1; // set to 1 to show in back office
			$this->module_key = '2b82d6f806de8acdf28bbfe9d1046fb6';
			$this->bootstrap = true;

			parent::__construct();

			$this->displayName = $this->l('Postcode Checkout');
			$this->description = $this->l('Enables address completion with the help of Postalcode + Housenumber');

			$this->confirmUninstall = $this->l('Are you sure you want to uninstall Postcode Checkout?');

			$this->aModuleConfig = array(
				'POSTCODECHECKOUT_LICENSEKEY' => '',
				'POSTCODECHECKOUT_ADDRESS_2' => 0,
				'POSTCODECHECKOUT_HIDE_FIELDS' => 0
			);
		}

		public function install()
		{
			foreach($this->aModuleConfig as $k => $v)
			{
				// Multistore Active?
				if(Shop::isFeatureActive())
				{
					$aShops = Shop::getShops();

					foreach($aShops as $aShop)
					{
						// Update configuration for each store
						if(!Configuration::updateValue($k, $v, false, null, (int)$aShop['id_shop']))
						{
							return false;
						}
					}
				}
				else
				{
					// Update configuration for this store
					if(!Configuration::updateValue($k, $v))
					{
						return false;
					}
				}
			}

			if(!parent::install() || !$this->registerHook('displayAfterBodyOpeningTag')
			)
			{
				return false;
			}

			return true;
		}

		public function uninstall()
		{
			foreach($this->aModuleConfig as $k => $v)
			{
				if(!Configuration::deleteByName($k))
				{
					return false;
				}
			}

			if(!parent::uninstall())
			{
				return false;
			}

			return true;
		}

		public function getContent()
		{
			$this->_html = '';

			if(Tools::isSubmit('submit_' . $this->name))
			{
				$this->_postValidation();

				if(!count($this->_postErrors))
				{
					$this->_postProcess();
				}
				else
				{
					foreach($this->_postErrors as $sError)
					{
						$this->_html .= $this->displayError($sError);
					}
				}
			}

			// Generate the Form
			$aForm[0] = array(
				'form' => array(
					'legend' => array(
						'title' => $this->l('Postcode Checkout - Settings'),
						'icon' => 'icon-cog'
					),
					'input' => array(
						array(
							'type' => 'text',
							'label' => $this->l('License key'),
							'name' => 'POSTCODECHECKOUT_LICENSEKEY',
							'required' => true
						),
						array(
							'type' => 'radio',
							'label' => $this->l('Addition on address 2'),
							'name' => 'POSTCODECHECKOUT_ADDRESS_2',
							'required' => false,
							'is_bool'   => true,
							'values'    => array(
								array(
								  'id'    => 'active_on',
								  'value' => 1,
								  'label' => $this->l('Yes')
								),
								array(
								  'id'    => 'active_off',
								  'value' => 0,
								  'label' => $this->l('No')
								)
							)
						),
						array(
							'type' => 'radio',
							'label' => $this->l('Hide fields'),
							'name' => 'POSTCODECHECKOUT_HIDE_FIELDS',
							'required' => false,
							'is_bool'   => true,
							'values'    => array(
								array(
								  'id'    => 'active_on',
								  'value' => 1,
								  'label' => $this->l('Yes')
								),
								array(
								  'id'    => 'active_off',
								  'value' => 0,
								  'label' => $this->l('No')
								)
							)
						)
					),
					'submit' => array(
						'title' => $this->l('Save'),
					)
				),
			);


			$aFieldValues = array(
				'POSTCODECHECKOUT_LICENSEKEY' => Tools::getValue('POSTCODECHECKOUT_LICENSEKEY', Configuration::get('POSTCODECHECKOUT_LICENSEKEY')),
				'POSTCODECHECKOUT_ADDRESS_2' => Tools::getValue('POSTCODECHECKOUT_ADDRESS_2', Configuration::get('POSTCODECHECKOUT_ADDRESS_2')),
				'POSTCODECHECKOUT_HIDE_FIELDS' => Tools::getValue('POSTCODECHECKOUT_HIDE_FIELDS', Configuration::get('POSTCODECHECKOUT_HIDE_FIELDS'))
			);


			$oFormHelper = new HelperForm();

			$oFormHelper->module = $this;
			$oFormHelper->name_controller = $this->name;
			$oFormHelper->token = Tools::getAdminTokenLite('AdminModules');
			$oFormHelper->currentIndex = AdminController::$currentIndex . '&configure=' . $this->name;

			$oFormHelper->title = $this->displayName;
			$oFormHelper->show_toolbar = false;
			$oFormHelper->submit_action = 'submit_' . $this->name;

			$oFormHelper->tpl_vars = array(
				'fields_value' => $aFieldValues,
			);

			$this->fields_form = array();

			$this->_html .= $oFormHelper->generateForm($aForm);

			return $this->_html;
		}

		private function _postValidation()
		{
			if(Tools::isSubmit('submit_' . $this->name))
			{

			}
		}

		private function _postProcess()
		{
			if(Tools::isSubmit('submit_' . $this->name))
			{
				Configuration::updateValue('POSTCODECHECKOUT_LICENSEKEY', Tools::getValue('POSTCODECHECKOUT_LICENSEKEY'));
				Configuration::updateValue('POSTCODECHECKOUT_ADDRESS_2', Tools::getValue('POSTCODECHECKOUT_ADDRESS_2'));
				Configuration::updateValue('POSTCODECHECKOUT_HIDE_FIELDS', Tools::getValue('POSTCODECHECKOUT_HIDE_FIELDS'));
			}

			$this->_html .= $this->displayConfirmation($this->l('Configuration updated!'));
		}

		public function hookDisplayAfterBodyOpeningTag()
		{
			$aControllers = array('authentication', 'address', 'order', 'order-opc');

			if(in_array($this->context->controller->php_self, $aControllers))
			{
				return $this->addPostcodecheckoutHtml();
			}
		}
		
		
		public function addPostcodecheckoutHtml()
		{
			$bIsUserLogged = $this->context->customer->isLogged();
			
			$this->context->smarty->assign(array(
                'postcodecheckout_path' => Tools::safeOutput(_PS_BASE_URL_SSL_.__PS_BASE_URI__),
				'postcodecheckout_nl_iso' => (int) Country::getByIso('NL'),
                'address_2' => Tools::safeOutput(Configuration::get('POSTCODECHECKOUT_ADDRESS_2') ? 'true' : 'false'),
                'hide_fields' => Tools::safeOutput(Configuration::get('POSTCODECHECKOUT_HIDE_FIELDS') ? 'true' : 'false'),
				'user_logged' => (bool)$bIsUserLogged,
				'postcode' => $this->l('Postalcode'),
				'housenumber' => $this->l('Housenumber'),
				'addition' => $this->l('Addition'),
				'enter_manually' => $this->l('Enter manually'),
				'enter_automatically' => $this->l('Enter automatically')
			));
			
            $sOutput = $this->context->smarty->fetch($this->local_path . 'views/templates/hook/loader.tpl');
			
			return $sOutput;
			
		}
	}

?>