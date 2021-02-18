

	console.log('Postcode config: ', pc4presta_config);

	var pc4presta_oDomElementsFields = null;
	var pc4presta_oDomElements = null;
	var pc4presta_speed = 400;
	var sOldAddition = null;

	// Delay function
	var delay = (function ()
	{
		var timer = 0;

		return function (callback, ms)
		{
			clearTimeout(timer);
			timer = setTimeout(callback, ms);
		};
	})();

	var pc4presta_wait = setInterval(function()
	{
		if (typeof jQuery !== 'undefined')
		{
			clearInterval(pc4presta_wait);
			addPostcodecheckout();
		}
	}, 20);

	function addPostcodecheckout()
	{
		//Page uses AJAX when country changes, so interval is needed?
		setInterval(function()
		{
			pc4presta_addLookup();
		}, pc4presta_speed);
	}

	function pc4presta_addLookup()
	{
		var aForm = []; //grab the unique forms

		jQuery.each(jQuery('[name="address1"]'), function()
		{
			aForm.push(jQuery(this).parents('div').eq(3));
		});

		var sTemplateHtml;

		jQuery.each(aForm, function()
		{
			var oForm = this;

			//Find country
			var sCountryValue = jQuery('[name="id_country"]').val();

			if(sCountryValue === '13')
			{
				if(oForm.find(jQuery('#pc4presta_' + oForm.attr('id') + '_postcode_wrapper')).length !== 1)
				{
					console.log('About to add the fields for the first time');
					pc4presta_hideForm(oForm.attr('id'));
				}
				else
				{
					return;
				}
			}
			else
			{
				return;
			}

			// Is logged in, and is addressfields filled?
			if(pc4presta_config.user_logged)
			{
				// console.log('PC 4 PRESTA: User is logged in');
				
				var sAddress1 = jQuery('[name="address1"]').val();
				// var sAddress2 = jQuery('[name="address2"]').val();
				var sPostcode = jQuery('[name="postcode"]').val();
				var sCity = jQuery('[name="city"]').val();				
				
				// Fields filled in?
				if((sAddress1.length > 0) && (sPostcode.length >= 6) && (sCity.length > 0))
				{
					pc4presta_restoreForm(oForm.attr('id'), true);
				}					
			}

			jQuery('#pc4presta_' + oForm.attr('id') + '_manualbtn').click(function()
			{
				pc4presta_restoreForm(oForm.attr('id'), true);
			});
			
			jQuery('#pc4presta_' + oForm.attr('id') + '_autobtn').click(function()
			{
				pc4presta_hideForm(oForm.attr('id'), true);
			});


			jQuery('#pc4presta_' + oForm.attr('id') + '_housenumber, #pc4presta_' + oForm.attr('id') + '_postcode').keyup(function ()
			{
				// console.log('PC 4 PRESTA: Keyup has taken place');
				pc4presta_doAction(oForm.attr('id'));
			});

			jQuery('#pc4presta_' + oForm.attr('id') +'_housenumber_addition').change(function ()
			{
				var sNewAdditionValue = jQuery('#pc4presta_' + oForm.attr('id') +'_housenumber_addition').val();

				pc4presta_changeHousenumberAddition(oForm.attr('id'), sNewAdditionValue);

			});

			function pc4presta_doAction(sFormId)
			{
				var sPostcode = jQuery('#pc4presta_' + sFormId + '_postcode').val().replace(/\s/g, "");
				var iHousenumber = jQuery('#pc4presta_' + sFormId + '_housenumber').val().replace(/(^\d+)(.*?$)/i, '$1');
				var xAddition = jQuery('#pc4presta_' + sFormId + '_housenumber').val().replace(/(^\d+)(.*?$)/i, '$2');

				if(sPostcode.length >= 6 && iHousenumber.length != 0)
				{
					delay(function ()
					{
						jQuery.ajax({
							url: 'https://www.postcode-checkout.nl/api/v2/',
							type: 'POST',
							dataType: 'json',
							data: {
								sPostcode: sPostcode,
								iHousenumber: iHousenumber,
								xAddition: xAddition
							},
							success: function (data)
							{
								console.log(data);

								if(typeof data.result !== 'undefined')
								{
									if(typeof data.result.street !== 'undefined' && typeof data.result.housenumber !== 'undefined' && typeof data.result.city !== 'undefined')
									{
										jQuery('[name="address1"]').val(data.result.street + ' ' + data.result.housenumber);

										sPostcode = pc4presta_formatPostcode(data.result.postcode);

										jQuery('[name="postcode"]').val(sPostcode);
										jQuery('[name="city"]').val(data.result.city);

										if(pc4presta_config.hide_fields === 'true')
										{
											pc4presta_updatePreview(sFormId);
										}
										else
										{
											jQuery('#pc4presta_' + sFormId + '_result').html('');
										}

										sOldAddition = null;
										pc4presta_setHouseNumberAdditions(sFormId, data.result.addition);
										
										jQuery('#pc4presta_' + sFormId + '_postcode').css('border-color', '#69bf29');
										jQuery('#pc4presta_' + sFormId + '_housenumber').css('border-color', '#69bf29');
									}
									else
									{
										jQuery('#pc4presta_' + sFormId + '_postcode').css('border-color', '#FF0000');
										jQuery('#pc4presta_' + sFormId + '_housenumber').css('border-color', '#FF0000');
									}
								}
								else
								{
									console.log(data.message);

									jQuery('[name="address1"]').val('');
									jQuery('[name="address2"]').val('');
									jQuery('[name="postcode"]').val('');
									jQuery('[name="city"]').val('');

									pc4presta_setHouseNumberAdditions(sFormId, []);


									if(typeof data.message !== 'undefined')
									{
										jQuery('#pc4presta_' + sFormId + '_result').html(data.message);
									}

									jQuery('#pc4presta_' + sFormId + '_postcode').css('border-color', '#FF0000');
									jQuery('#pc4presta_' + sFormId + '_housenumber').css('border-color', '#FF0000');

								}
							}
						});
					}, 600);
				}
			}

			function pc4presta_formatPostcode(sPostcode)
			{
				sPostcode = sPostcode.replace(/(\d{4})/g, '$1 ').replace(/(^\s+|\s+$)/, '')

				return sPostcode;
			}

			function pc4presta_updatePreview(sFormId)
			{
				if(pc4presta_config.address_2  === 'true')
				{
					jQuery('#pc4presta_' + sFormId + '_result').html(
						jQuery('[name="address1"]').val() + ' ' + jQuery('[name="address2"]').val() + '<br>' + jQuery('[name="postcode"]').val() + ' ' + jQuery('[name="city"]').val());
				}
				else
				{
					jQuery('#pc4presta_' + sFormId + '_result').html(
						jQuery('[name="address1"]').val() + '<br>' + jQuery('[name="postcode"]').val() + ' ' + jQuery('[name="city"]').val());
				}
			}

			function pc4presta_setHouseNumberAdditions(sFormId, aAdditions)
			{
				jQuery('#pc4presta_' + sFormId + '_housenumber_addition').empty();


				if(jQuery('#pc4presta_' + sFormId + '_housenumber_addition') && jQuery(aAdditions).length > 1)
				{
					var sAdditionValue = jQuery('#pc4presta_' + sFormId + '_housenumber_addition').val();

					jQuery.each(aAdditions, function(key, sAddition)
					{
						jQuery('#pc4presta_' + sFormId + '_housenumber_addition')
						.append(jQuery('<option>', { value : sAddition })
						.text(sAddition));
					});

					jQuery('#pc4presta_' + sFormId + '_housenumber_addition_wrapper').show(pc4presta_speed);
					jQuery('#pc4presta_' + sFormId + '_housenumber_addition').val(sAdditionValue);
				}
			}

			function pc4presta_changeHousenumberAddition(sFormId, sNewAdditionValue)
			{
				var sCurrentStreetValue = false;
				var sNewStreetvalue = false;
				var sAddition = false;

				if(sNewAdditionValue == 'undefined')
				{
					return;
				}

				if(pc4presta_config.address_2  === 'true')
				{
					sCurrentStreetValue = pc4presta_removeAdditionFromStreet(jQuery('[name="address2"]').val());

					sAddition = (sNewAdditionValue) ? ' ' +  sNewAdditionValue : '';
					sNewStreetvalue = sCurrentStreetValue + sAddition;

					jQuery('[name="address2"]').val(sNewStreetvalue);
				}
				else
				{
					sCurrentStreetValue = pc4presta_removeAdditionFromStreet(jQuery('[name="address1"]').val());

					sAddition = (sNewAdditionValue) ? ' ' +  sNewAdditionValue : '';
					sNewStreetvalue = sCurrentStreetValue + sAddition;

					jQuery('[name="address1"]').val(sNewStreetvalue);
				}

				sOldAddition = sNewAdditionValue;

				if(pc4presta_config.hide_fields === 'true')
				{
					pc4presta_updatePreview(sFormId);
				}
				else
				{
					jQuery('#pc4presta_' + sFormId + '_result').html('');
				}
			}

			function pc4presta_removeAdditionFromStreet(sCurrentFieldValue)
			{
				if(sOldAddition !== null && sOldAddition && sCurrentFieldValue)
				{
					var aParts = ("" + sCurrentFieldValue).split(" ");

					if(aParts.length > 1)
					{
						aParts.pop();
					}

					sCurrentFieldValue = aParts.join(" ");

					return sCurrentFieldValue;
				}

				return sCurrentFieldValue;
			}


			function pc4presta_getDomElementsFields()
			{
				pc4presta_oDomElementsFields =
				{
					address_1: jQuery('[name="address1"]').closest('.form-group'),
					address_2: jQuery('[name="address2"]').closest('.form-group'),
					postcode: jQuery('[name="postcode"]').closest('.form-group'),
					city: jQuery('[name="city"]').closest('.form-group'),
					country: jQuery('[name="id_country"]').closest('.form-group')
				};

				return pc4presta_oDomElementsFields;
			}

			function pc4presta_getElements()
			{
				pc4presta_oDomElements =
				{
					address_1: jQuery('[name="address1"]'),
					address_2: jQuery('[name="address2"]'),
					postcode: jQuery('[name="postcode"]'),
					city: jQuery('[name="city"]'),
					country: jQuery('[name="id_country"]')
				};

				return pc4presta_oDomElements;
			}

			function pc4presta_hideForm(sFormId, bCheckbox)
			{
				// console.log('PC 4 presta pc4presta_hideForm: Form should be shown.');
				// console.log('bCheckbox status is: ', bCheckbox);
				
				oFields = pc4presta_getDomElementsFields();
				oElements = pc4presta_getElements();

				if(typeof bCheckbox !== 'undefined')
				{
					// Field wrappers
					jQuery('#pc4presta_' + sFormId + '_postcode_wrapper').show(pc4presta_speed);
					jQuery('#pc4presta_' + sFormId + '_housenumber_wrapper').show(pc4presta_speed);
					jQuery('#pc4presta_' + sFormId + '_housenumber_addition_wrapper').hide(pc4presta_speed);
					jQuery('#pc4presta_' + sFormId + '_result_wrapper').show(pc4presta_speed);
					
					// Buttons
					jQuery('#pc4presta_' + sFormId + '_manualbtn').show(pc4presta_speed);
					jQuery('#pc4presta_' + sFormId + '_autobtn').hide(pc4presta_speed);


					// Add required property
					jQuery('#pc4presta_' + sFormId + '_postcode').prop('required', true);
					jQuery('#pc4presta_' + sFormId + '_housenumber').prop('required', true);
					jQuery('#pc4presta_' + sFormId + '_housenumber_addition').prop('required', false);
					jQuery('#pc4presta_' + sFormId + '_result').prop('required', true);
				}
				else
				{

					// Add our template to the checkout
					var sPc4prestaSearchTemplate =
							'<div class="form-group row" id="pc4presta_' + sFormId + '_postcode_wrapper">' +
								'<label class="col-md-3 form-control-label">' + presta_trans.postcode + '</label>' +
								'<div class="col-md-6">' +
									'<input id="pc4presta_' + sFormId + '_postcode" name="pc4presta_' + sFormId + '_postcode" class="form-control" type="text" placeholder="1234 AB" required>' +
								'</div>'+
							'</div>' +
							'<div class="form-group row" id="pc4presta_' + sFormId + '_housenumber_wrapper">' +
								'<label class="col-md-3 form-control-label">' + presta_trans.housenumber + '</label>' +
								'<div class="col-md-6">' +
									'<input id="pc4presta_' + sFormId + '_housenumber" name="pc4presta_' + sFormId + '_housenumber" class="form-control" type="text" placeholder="1" required>' +
								'</div>' +
							'</div>' +
							'<div class="form-group row" id="pc4presta_' + sFormId + '_housenumber_addition_wrapper" style="display: none;">' +
								'<label class="col-md-3 form-control-label">' + presta_trans.addition + '</label>' +
								'<div class="col-md-6">' +
									'<select class="form-control form-control-select" type="select" class="input-text" name="pc4presta_' + sFormId + '_housenumber_addition" id="pc4presta_' + sFormId + '_housenumber_addition" value=""></select>' +
								'</div>' +
							'</div>' +
							'<div class="form-group row" id="pc4presta_' + sFormId + '_result_wrapper">' +
								'<label class="col-md-3 form-control-label"></label>' +
								'<div class="col-md-6" id="pc4presta_' + sFormId + '_result"></div>' +
							'</div>' +
							'<div class="required form-group row">' +
								'<label class="col-md-3 form-control-label"></label>' +
								'<div class="col-md-3">' +
									'<button type="button" class="btn btn-default button button-small" id="pc4presta_' + sFormId + '_manualbtn">' +
										'<span>' + presta_trans.enter_manually + '<i class="icon-chevron-right right"></i></span>' +
									'</button>' +
									'<button type="button" class="btn btn-default button button-small" id="pc4presta_' + sFormId + '_autobtn" style="display: none;">' +
										'<span>' + presta_trans.enter_automatically + '<i class="icon-chevron-right right"></i></span>' +
									'</button>' +
								'</div>' +
							'</div>';

					jQuery(oFields.address_1).before(sPc4prestaSearchTemplate);
				}

				if(pc4presta_config.hide_fields === 'true')
				{
					// console.log('PC 4 PRESTA: hide FIELDS', oFields);
					var domKeys = Object.keys(oFields);

					for(var iDom = 0; iDom < domKeys.length; iDom++)
					{
						if(domKeys[iDom] != 'country')
						{
							if(pc4presta_config.empty_fields === 'true')
							{
								jQuery(oFields[domKeys[iDom]]).attr('value', '');
							}

							jQuery(oFields[domKeys[iDom]]).hide(pc4presta_speed);

							// console.log('PC 4 PRESTA: HIDE FIELD', oFields[domKeys[iDom]]);
						}
					}
				}
				else
				{
					// Disable the input fields
					// console.log('PC 4 PRESTA: disable the FIELDS', oElements);

					var domKeys = Object.keys(oElements);

					for(var iDom = 0; iDom < domKeys.length; iDom++)
					{
						if(domKeys[iDom] != 'country')
						{
							if(pc4presta_config.empty_fields === 'true')
							{
								jQuery(oFields[domKeys[iDom]]).attr('value', '');
							}

							jQuery(oElements[domKeys[iDom]]).attr('readonly', '');
							// console.log('PC 4 PRESTA: ENABLE FIELD', oElements[domKeys[iDom]]);
						}
					}
				}
			}


			function pc4presta_restoreForm(sFormId, bCheckbox)
			{
				// console.log('PC 4 PRESTA pc4presta_restoreForm(' + sFormId + '): Form should be hidden.');

				oFields = pc4presta_getDomElementsFields();
				oElements = pc4presta_getElements();

				if(pc4presta_config.hide_fields === 'true')
				{
					// console.log('PC 4 PRESTA: show FIELDS', oFields);

					var domKeys = Object.keys(oFields);

					for(var iDom = 0; iDom < domKeys.length; iDom++)
					{
						if(domKeys[iDom] != 'country')
						{
							jQuery(oFields[domKeys[iDom]]).show(pc4presta_speed);
							// console.log('PC 4 PRESTA: SHOW FIELD', oFields[domKeys[iDom]]);
						}
					}

					// console.log('PC 4 PRESTA: SHOW the fields');
				}
				else
				{
					// Enable the input fields
					// console.log('PC 4 PRESTA: Enable the FIELDS', oElements);

					var domKeys = Object.keys(oElements);

					for(var iDom = 0; iDom < domKeys.length; iDom++)
					{
						if(domKeys[iDom] != 'country')
						{
							jQuery(oElements[domKeys[iDom]]).removeAttr('readonly');
							console.log('PC 4 PRESTA: DISABLE FIELD', oElements[domKeys[iDom]]);
						}
					}
				}

				if(typeof bCheckbox !== 'undefined')
				{
					//Field wrappers
					jQuery('#pc4presta_' + sFormId + '_postcode_wrapper').hide(pc4presta_speed);
					jQuery('#pc4presta_' + sFormId + '_housenumber_wrapper').hide(pc4presta_speed);
					jQuery('#pc4presta_' + sFormId + '_housenumber_addition_wrapper').hide(pc4presta_speed);
					jQuery('#pc4presta_' + sFormId + '_result_wrapper').hide(pc4presta_speed);
					
					// Buttons
					jQuery('#pc4presta_' + sFormId + '_manualbtn').hide(pc4presta_speed);
					jQuery('#pc4presta_' + sFormId + '_autobtn').show(pc4presta_speed);

					// Remove required property
					jQuery('#pc4presta_' + sFormId + '_postcode').prop('required', false);
					jQuery('#pc4presta_' + sFormId + '_housenumber').prop('required', false);
					jQuery('#pc4presta_' + sFormId + '_housenumber_addition').prop('required', false);
					jQuery('#pc4presta_' + sFormId + '_result').prop('required', false);
				}
				else
				{
					// Field wrappers
					// jQuery('#pc4presta_' + sFormId + '_wrapper').remove();
					jQuery('#pc4presta_' + sFormId + '_postcode_wrapper').remove();
					jQuery('#pc4presta_' + sFormId + '_housenumber_wrapper').remove();
					jQuery('#pc4presta_' + sFormId + '_housenumber_addition_wrapper').remove();
					jQuery('#pc4presta_' + sFormId + '_result_wrapper').remove();
					
					// Buttons
					jQuery('#pc4presta_' + sFormId + '_manualbtn').remove();
					jQuery('#pc4presta_' + sFormId + '_autobtn').remove();
				}
			}

		});

	}



