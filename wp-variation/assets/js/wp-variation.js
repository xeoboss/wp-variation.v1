(function($) {
    'use strict';

    $(document).ready(function() {
        var WPVariation = {

            notificationTimer: null,
            $form: $('.variations_form'),
            initialized: false, // Flag to track initialization

            init: function() {
                if (this.initialized) {
                    console.log('WPVariation already initialized, skipping.');
                    return; // Prevent duplicate initialization
                }

                this.$form.find('.variations').hide();
                this.$form.find('.single_variation_wrap').hide();
                this.$form.find('.quantity').hide();

                this.createVariationRows();
                this.bindEvents();
                this.handleImageChange();
                this.createNotificationElements();

                console.log('init fonksiyonu çalıştı, updateTotalPrice çağrılıyor...');
                this.updateTotalPrice();

                this.initialized = true; // Set the initialized flag
            },

            createNotificationElements: function() {
                $('.wp-variation-overlay, .woocommerce-variation-add-to-cart-notification, .added-to-cart-notification').remove();

                var $notification = $('<div class="wp-variation-notification">' +
                    '<div class="notification-content">' +
                    '<span class="check-icon">✓</span>' +
                    '<p class="message">Ürünler başarıyla sepete eklendi</p>' +
                    '</div>' +
                    '</div>');

                $notification.css({
                    'display': 'none',
                    'position': 'fixed',
                    'top': '50%',
                    'left': '50%',
                    'transform': 'translate(-50%, -50%)',
                    'background-color': '#4CAF50',
                    'color': 'white',
                    'padding': '12px 20px',
                    'border-radius': '5px',
                    'box-shadow': '0 2px 15px rgba(0,0,0,0.3)',
                    'z-index': '9999',
                    'text-align': 'center',
                    'max-width': '300px',
                    'width': 'auto',
                    'min-width': '220px'
                });

                $notification.find('.notification-content').css({
                    'display': 'flex',
                    'align-items': 'center',
                    'justify-content': 'center'
                });

                $notification.find('.check-icon').css({
                    'font-size': '24px',
                    'margin-right': '10px'
                });

                $('body').append($notification);
            },

            updateTotalPrice: function() {
                console.log('updateTotalPrice fonksiyonu çağrıldı');
                var total = 0;

                var $rows = this.$form.find('.wp-variation-row');
                console.log('Bulunan varyasyon satırı sayısı:', $rows.length);

                $rows.each(function(index) {
                    var $row = $(this);
                    var variationId = $row.data('variation_id');
                    var variation = $row.data('variation');

                    console.log('Satır', index, 'variation ID:', variationId);
                    console.log('Satır', index, 'variation data:', variation);

                    if (variationId && variation && variation.display_price) {
                        total += parseFloat(variation.display_price);
                        console.log('Fiyat eklendi:', variation.display_price);
                    } else if ($row.find('.variation-option.selected').length > 0) {
                        $row.find('.variation-option.selected').each(function() {
                            var price = parseFloat($(this).data('price') || 0);
                            console.log('Seçili opsiyon fiyatı:', price);
                            total += price;
                        });
                    }
                });

                console.log('Toplam fiyat:', total);

                var $buttonsContainer = this.$form.find('.wp-variation-buttons-container');

                if ($buttonsContainer.length === 0) {
                    $buttonsContainer = $('<div class="wp-variation-buttons-container"></div>');

                    if ($rows.length > 0) {
                        var $variationContainer = $rows.last().parent();
                        $variationContainer.after($buttonsContainer);
                    } else {
                        this.$form.append($buttonsContainer);
                    }
                } else {
                    var $content = $buttonsContainer.children().detach();
                    $buttonsContainer.remove();

                    if ($rows.length > 0) {
                        var $variationContainer = $rows.last().parent();
                        $variationContainer.after($buttonsContainer);
                        $buttonsContainer.append($content);
                    } else {
                        this.$form.append($buttonsContainer);
                        $buttonsContainer.append($content);
                    }
                }

                var $buttonGroup = $buttonsContainer.find('.wp-variation-button-group');
                if ($buttonGroup.length === 0) {
                    $buttonGroup = $('<div class="wp-variation-button-group"></div>');
                    $buttonsContainer.append($buttonGroup);
                }

                var $totalPriceDisplay = $buttonsContainer.find('.total-variations-price');
                if ($totalPriceDisplay.length === 0) {
                    $totalPriceDisplay = $('<div class="total-variations-price"></div>');
                    $buttonsContainer.append($totalPriceDisplay);
                }

                var $addToCartButton = $buttonGroup.find('.wp-variation-add-to-cart');
                if ($addToCartButton.length === 0) {
                    $addToCartButton = this.$form.find('.wp-variation-add-to-cart');
                    if ($addToCartButton.length > 0) {
                        $addToCartButton.detach().appendTo($buttonGroup);
                    } else {
                        $addToCartButton = $('<button type="submit" class="wp-variation-add-to-cart">Sepete Ekle</button>');
                        $buttonGroup.append($addToCartButton);
                    }
                }

                var $addAnotherButton = $buttonGroup.find('.wp-variation-add-another');
                if ($addAnotherButton.length === 0) {
                    $addAnotherButton = this.$form.find('.wp-variation-add-another');
                    if ($addAnotherButton.length > 0) {
                        $addAnotherButton.detach().appendTo($buttonGroup);
                    } else {
                        $addAnotherButton = $('<button type="button" class="wp-variation-add-another">Başka Ekle</button>');
                        $buttonGroup.append($addAnotherButton);
                    }
                }
                if (total > 0) {
                    var formattedPrice = this.formatPrice(total);
                    $totalPriceDisplay.html('<strong>Toplam:</strong> <span class="amount">' + formattedPrice + '</span>');
                    $totalPriceDisplay.show();
                } else {
                    $totalPriceDisplay.hide();
                }

                $buttonsContainer.css({
                    'display': 'flex',
                    'justify-content': 'space-between',
                    'align-items': 'center',
                    'margin-top': '-20px',
                    'padding-top': '10px',
                    'border-top': '1px solid #eee',
                    'flex-wrap': 'wrap',
                    'width': '100%'
                });

                $buttonGroup.css({
                    'display': 'flex',
                    'gap': '10px',
                    'align-items': 'center',
                    'flex-shrink': '0'
                });

                $addToCartButton.css({
                    'background-color': '#4CAF50',
                    'color': 'white',
                    'border': 'none',
                    'padding': '12px 20px',
                    'border-radius': '30px',
                    'cursor': 'pointer',
                    'font-weight': '600',
                    'font-size': '14px',
                    'transition': 'all 0.3s ease',
                    'box-shadow': '0 2px 5px rgba(0,0,0,0.1)',
                    'text-align': 'center',
                    'min-width': '120px',
                    'transform': 'translateY(0)',
                    'position': 'relative'
                });

                $addAnotherButton.css({
                    'background-color': '#8e44ad',
                    'color': 'white',
                    'border': 'none',
                    'padding': '12px 20px',
                    'border-radius': '30px',
                    'cursor': 'pointer',
                    'font-weight': '600',
                    'font-size': '14px',
                    'transition': 'all 0.3s ease',
                    'box-shadow': '0 2px 5px rgba(0,0,0,0.1)',
                    'text-align': 'center',
                    'min-width': '120px',
                    'transform': 'translateY(0)',
                    'position': 'relative'
                });

                $totalPriceDisplay.css({
                    'display': 'block',
                    'margin-left': 'auto',
                    'margin-right': '0',
                    'padding': '8px 15px',
                    'background-color': '#f7f7f7',
                    'border-radius': '3px',
                    'font-size': '1.1em',
                    'border-left': '3px solid #77a464',
                    'white-space': 'nowrap',
                    'flex-shrink': '0',
                    'align-self': 'flex-end'
                });

                $totalPriceDisplay.find('.amount').css({
                    'color': '#77a464',
                    'font-weight': 'bold'
                });

                $addToCartButton.hover(
                    function() {
                        $(this).css({
                            'background-color': '#45a049',
                            'transform': 'translateY(-3px)',
                            'box-shadow': '0 4px 8px rgba(0,0,0,0.2)'
                        });
                    },
                    function() {
                        $(this).css({
                            'background-color': '#4CAF50',
                            'transform': 'translateY(0)',
                            'box-shadow': '0 2px 5px rgba(0,0,0,0.1)'
                        });
                    }
                );

                $addAnotherButton.hover(
                    function() {
                        $(this).css({
                            'background-color': '#7d3c98',
                            'transform': 'translateY(-3px)',
                            'box-shadow': '0 4px 8px rgba(0,0,0,0.2)'
                        });
                    },
                    function() {
                        $(this).css({
                            'background-color': '#8e44ad',
                            'transform': 'translateY(0)',
                            'box-shadow': '0 2px 5px rgba(0,0,0,0.1)'
                        });
                    }
                );

                if (window.innerWidth <= 600) {
                    $buttonsContainer.css('flex-direction', 'column');
                    $buttonGroup.css({
                        'width': '100%',
                        'margin-bottom': '15px',
                        'justify-content': 'space-between'
                    });
                    $totalPriceDisplay.css({
                        'margin-left': '0',
                        'width': '100%',
                        'text-align': 'center',
                        'box-sizing': 'border-box'
                    });
                    $addToCartButton.css({
                        'flex': '1',
                        'min-width': '0'
                    });
                    $addAnotherButton.css({
                        'flex': '1',
                        'min-width': '0'
                    });
                }
            },
            formatPrice: function(price) {
                if (typeof woocommerce_price_format !== 'undefined') {
                    return woocommerce_price_format.formatMoney(price);
                }
                return price.toFixed(2) + ' ₺';
            },

            showNotification: function(message, type) {
                var self = this;
                var $notification = $('.wp-variation-notification');

                if ($notification.length === 0) {
                    this.createNotificationElements();
                    $notification = $('.wp-variation-notification');
                }

                if (message) {
                    $notification.find('.message').text(message);
                }

                if (self.notificationTimer) {
                    clearTimeout(self.notificationTimer);
                    self.notificationTimer = null;
                }

                $notification.stop(true, true).fadeIn(300);

                self.notificationTimer = setTimeout(function() {
                    self.hideNotification();
                }, 2000);
            },

            hideNotification: function() {
                $('.wp-variation-notification').fadeOut(300);
                if (this.notificationTimer) {
                    clearTimeout(this.notificationTimer);
                    this.notificationTimer = null;
                }
            },

            createVariationRows: function() {
                var self = this;
                var $originalVariations = this.$form.find('.variations');
                var $rowsContainer = $('<div class="wp-variation-rows"></div>');

                // Add the first variation row
                self.addVariationRow($rowsContainer);

                var $controls = $('<div class="wp-variation-controls"></div>');
                var $addAnother = $('<button type="button" class="wp-variation-add-another">' +
                    wp_variation_params.i18n_add_another +
                    '</button>');

                // Click handler for "Add Another" button
                $addAnother.on('click', function(e) {
                    e.preventDefault();
                    self.addVariationRow($rowsContainer); // Call addVariationRow to add a new row
                });

                $controls.append($addAnother);

                var $addToCart = $('<button type="button" class="single_add_to_cart_button button alt wp-variation-add-to-cart">Sepete Ekle</button>');
                $addToCart.off('click').on('click', function(e) {
                    e.preventDefault();

                    var $currentRow = $(this).closest('.wp-variation-row');

                    if (!$currentRow.length) {
                        console.error('Could not find .wp-variation-row');
                        return;
                    }

                    var variationId = $currentRow.data('variation_id');

                    console.log('variationId:', variationId);

                    var quantity = 1;
                    var $quantityInput = $currentRow.find('.quantity input');

                    if ($quantityInput.length > 0 && $quantityInput.val()) {
                        quantity = parseInt($quantityInput.val(), 10);
                    }

                    if (!variationId || variationId <= 0) {
                        alert('Lütfen önce bir varyasyon seçin!');
                        return;
                    }

                    var $button = $(this);
                    $button.addClass('loading').prop('disabled', true);

                    $.ajax({
                        type: 'POST',
                        url: wc_add_to_cart_params ? wc_add_to_cart_params.wc_ajax_url.toString().replace('%%endpoint%%', 'add_to_cart') : '?wc-ajax=add_to_cart',
                        data: {
                            product_id: self.$form.data('product_id'),
                            variation_id: variationId,
                            quantity: quantity,
                            'add-to-cart': self.$form.data('product_id')
                        },
                        success: function(response) {
                            if (response.error && response.product_url) {
                                window.location = response.product_url;
                                return;
                            }

                            if (response.fragments) {
                                $.each(response.fragments, function(key, value) {
                                    $(key).replaceWith(value);
                                });
                            }

                            $button.removeClass('loading').addClass('added');

                            var $successMsg = $('<span class="success-msg" style="color:green;margin-left:10px;">✓ Ürün sepete eklendi!</span>');
                            $button.after($successMsg);

                            setTimeout(function() {
                                $successMsg.fadeOut('slow', function() {
                                    $(this).remove();
                                });
                            }, 2000);

                            $(document.body).trigger('added_to_cart', [response.fragments, response.cart_hash, $button]);
                        },
                        error: function(jqXHR, textStatus, errorThrown) {
                            console.error('Sepete ekleme hatası:', textStatus, errorThrown);
                            console.log('Response:', jqXHR.responseText);
                            $button.removeClass('loading').prop('disabled', false);
                            alert('Ürün sepete eklenirken bir hata oluştu. Lütfen tekrar deneyin.');
                        },
                        complete: function() {
                            setTimeout(function() {
                                $button.removeClass('loading').prop('disabled', false);
                            }, 500);
                        }
                    });
                });

                $controls.append($addToCart);

                this.$form.prepend($rowsContainer);
                this.$form.append($controls);
            },

            addVariationRow: function($container) {
                var self = this;
                var isFirstRow = $container.find('.wp-variation-row').length === 0;
                var currentRowCount = $container.find('.wp-variation-row').length;

                if (currentRowCount >= 8) {
                    alert('Maksimum 8 adet varyasyon eklenebilir!');
                    return false;
                }

                var $row = $('<div class="wp-variation-row"></div>');
                var $attributes = $('<div class="wp-variation-attributes"></div>');

                this.$form.find('.variations tr').each(function() {
                    var $originalLabel = $(this).find('label');
                    var $originalSelect = $(this).find('select');

                    var attributeName = $originalSelect.attr('name');
                    var attributeId = 'wp-variation-' + attributeName + '-' + Math.floor(Math.random() * 10000);

                    var $attribute = $('<div class="wp-variation-attribute"></div>');

                    if (isFirstRow) {
                        var $label = $('<label for="' + attributeId + '">' + $originalLabel.text() + '</label>');
                        $attribute.append($label);
                    }

                    var $select = $originalSelect.clone();

                    $select.attr('id', attributeId);
                    $select.val('');

                    $attribute.append($select);
                    $attributes.append($attribute);
                });

                var $price = $('<div class="wp-variation-price">Seçim yapınız</div>');

                $row.append($attributes);
                $row.append($price);

                if (!isFirstRow) {
                    var $remove = $('<div class="wp-variation-remove">&times;</div>');
                    $row.append($remove);

                    $remove.on('click', function() {
                        $row.slideUp(300, function() {
                            $(this).remove();
                        });
                    });
                }

                $row.find('select').on('change', function() {
                    var name = $(this).attr('name');
                    var value = $(this).val();

                    self.$form.find('.variations select[name="' + name + '"]').val(value).trigger('change');

                    self.handleVariationChange($row);
                });

                $container.append($row);

                return $row;
            },

            findMatchingVariation: function(variations, attributes) {
                for (var i = 0; i < variations.length; i++) {
                    var variation = variations[i];
                    var match = true;

                    for (var attr_name in attributes) {
                        if (attributes.hasOwnProperty(attr_name)) {
                            var val1 = attributes[attr_name];
                            var val2 = variation.attributes[attr_name];

                            if (val1 === '' || val2 === '') {
                                continue;
                            }

                            if (val1 !== val2) {
                                match = false;
                                break;
                            }
                        }
                    }

                    if (match) {
                        return variation;
                    }
                }

                return false;
            },

            handleVariationChange: function($row) {
                var self = this;
                var attributes = {};
                var variations = [];

                if (this.$form.data('product_variations')) {
                    variations = this.$form.data('product_variations');
                }

                var rowId = $row.data('row_id') || 'row_' + new Date().getTime();
                $row.data('row_id', rowId);

                var existingAttributes = {};
                $('select[name^="attribute_"]').each(function(index) {
                    var $selectAttr = $(this);
                    var attrName = $selectAttr.attr('name');
                    var value = $selectAttr.val();
                    var options = [];

                    $selectAttr.find('option').each(function() {
                        options.push({
                            value: $(this).val(),
                            text: $(this).text(),
                            selected: $(this).is(':selected')
                        });
                    });

                    if (options.length > 1 && (!value || value === '')) {
                        var firstValidOption = options.find(o => o.value !== '');
                        if (firstValidOption) {
                            console.log("Manuel seçim yapılıyor:", attrName, "Değer:", firstValidOption.value);
                            $selectAttr.val(firstValidOption.value);
                            value = firstValidOption.value;
                        }
                    }

                    existingAttributes[attrName] = value;
                });

                $row.find('.wp-variation-attribute select').each(function() {
                    var $select = $(this);
                    var attrName = $select.attr('name');
                    var value = $select.val() || existingAttributes[attrName] || '';

                    if (value === '' || value === null) {
                        var $options = $select.find('option[value!=""]');
                        if ($options.length > 0) {
                            value = $options.first().val();
                            $select.val(value);
                            console.log("Satır özelliği için manuel seçim:", attrName, "Değer:", value);
                        }
                    }

                    attributes[attrName] = value;
                });

                console.log('Satır ID:', rowId, 'Seçilen özellikler:', attributes);

                var allSelected = true;
                var emptyAttrs = [];
                for (var attrName in attributes) {
                    if (attributes[attrName] === '') {
                        allSelected = false;
                        emptyAttrs.push(attrName);
                    }
                }

                if (!allSelected) {
                    $row.find('.wp-variation-price').html('Seçim yapınız');
                    $row.data('variation_id', 0);
                    return;
                }

                var matchingVariation = this.findMatchingVariation(variations, attributes);

                if (!matchingVariation && variations.length > 0) {
                    console.log("Eşleşme bulunamadı, alternatif aranıyor...");

                    var bestMatch = null;
                    var bestMatchCount = 0;

                    for (var i = 0; i < variations.length; i++) {
                        var variation = variations[i];
                        var matchCount = 0;
                        var variationAttributes = variation.attributes;

                        for (var attrName in attributes) {
                            var selectedValue = attributes[attrName];
                            var variationValue = variationAttributes[attrName];

                            if (selectedValue === variationValue || variationValue === '' || variationValue === '*') {
                                matchCount++;
                            }
                        }

                        if (matchCount > bestMatchCount) {
                            bestMatchCount = matchCount;
                            bestMatch = variation;
                        }
                    }

                    if (bestMatch && bestMatchCount > 0) {
                        matchingVariation = bestMatch;
                        console.log("Alternatif varyasyon bulundu:", bestMatchCount, "özellik eşleşti", matchingVariation);

                        for (var attrName in attributes) {
                            if (bestMatch.attributes[attrName] !== attributes[attrName] && bestMatch.attributes[attrName] !== '' && bestMatch.attributes[attrName] !== '*') {
                                var newValue = bestMatch.attributes[attrName];
                                var $attrSelect = $row.find('.wp-variation-attribute select[name="' + attrName + '"]');
                                if ($attrSelect.length > 0 && $attrSelect.find('option[value="' + newValue + '"]').length > 0) {
                                    $attrSelect.val(newValue);
                                    attributes[attrName] = newValue;
                                    console.log("Seçim güncellendi:", attrName, "Yeni değer:", newValue);
                                }
                            }
                        }
                    }
                }

                // Set the variation ID on the row
                if (matchingVariation) {
                    if (matchingVariation.is_in_stock && matchingVariation.is_purchasable) {
                        if (matchingVariation.price_html) {
                            $row.find('.wp-variation-price').html(matchingVariation.price_html);
                        } else if (matchingVariation.display_price) {
                            var price = matchingVariation.display_price;

                            var currencySymbol = '';
                            if (typeof wp_variation_params !== 'undefined' && wp_variation_params.currency_symbol) {
                                currencySymbol = wp_variation_params.currency_symbol;
                            }

                            $row.find('.wp-variation-price').html(currencySymbol + ' ' + price.toFixed(2));
                        } else {
                            $row.find('.wp-variation-price').html('Fiyat bilgisi alınamadı');
                        }

                        $row.data('variation_id', matchingVariation.variation_id);
                        $row.data('variation', matchingVariation);

                        this.updateVariationImage($row, matchingVariation);

                        console.log("Varyasyon seçimi tamamlandı! Ürün sepete eklenebilir:", matchingVariation.variation_id);

                    } else {
                        $row.find('.wp-variation-price').html('Stokta yok');
                        $row.data('variation_id', 0);
                    }
                } else {
                    $row.find('.wp-variation-price').html('Bu kombinasyon mevcut değil');
                    $row.data('variation_id', 0);
                }
                // Trigger an event after the variation has changed
                $row.trigger('wp_variation_changed', matchingVariation);


                if (this.$form && this.$form.length > 0) {
                    setTimeout(function() {
                        self.$form.trigger('woocommerce_variation_has_changed');
                    }, 50);
                }
            },

            updateVariationImage: function($row, variation) {
                var $imageContainer = $row.find('.wp-variation-image-container');

                if (!$imageContainer.length) {
                    console.log('Satır için özel görsel alanı bulunamadı');

                    var $productImage = $('.woocommerce-product-gallery__image img, .product-images img').first();

                    if (variation.image && variation.image.src && $productImage.length) {
                        if (!$productImage.data('original_src')) {
                            $productImage.data('original_src', $productImage.attr('src'));
                        }

                        if ($productImage.attr('src') !== variation.image.src) {
                            console.log('Ana ürün görseli güncelleniyor:', variation.image.src);
                            $productImage.attr('src', variation.image.src);

                            if (variation.image.full_src) {
                                $productImage.parent('a').attr('href', variation.image.full_src);
                            }
                        }
                    }

                    return;
                }

                if (variation.image && variation.image.src) {
                    var imageHtml = '<img src="' + variation.image.src + '" alt="' + (variation.image.alt || '') + '" />';
                    $imageContainer.html(imageHtml);
                } else {
                    $imageContainer.html('');
                }
            },
            filterUnavailableOptions: function($row, selectedAttributes) {
                var variations = this.getAvailableVariations();
                var $selects = $row.find('.wp-variation-attribute select');

                $selects.each(function() {
                    var $thisSelect = $(this);
                    var currentAttrName = $thisSelect.attr('name');
                    var availableOptionsForThisSelect = [];

                    for (var i = 0; i < variations.length; i++) {
                        var variation = variations[i];
                        var match = true;

                        for (var attrName in selectedAttributes) {
                            if (attrName !== currentAttrName && selectedAttributes[attrName] !== '') {
                                var variationAttrValue = variation.attributes[attrName] || '';
                                if (variationAttrValue !== '' && variationAttrValue !== selectedAttributes[attrName]) {
                                    match = false;
                                    break;
                                }
                            }
                        }

                        if (match) {
                            var optionVal = variation.attributes[currentAttrName] || '';
                            if (optionVal && !availableOptionsForThisSelect.includes(optionVal)) {
                                availableOptionsForThisSelect.push(optionVal);
                            }
                        }
                    }

                    $thisSelect.find('option').each(function() {
                        var $option = $(this);
                        var value = $option.val();

                        if (!value || availableOptionsForThisSelect.includes(value)) {
                            $option.prop('disabled', false);
                        } else {
                            $option.prop('disabled', true);
                        }
                    });
                });
            },

            getAvailableVariations: function() {
                if (this.$form.data('product_variations')) {
                    return this.$form.data('product_variations');
                } else {
                    return [];
                }
            },

            updateProductImage: function(imageData) {
                var $productImage = $('.woocommerce-product-gallery__wrapper').first();

                if ($productImage.length) {
                    var imageHtml = '<div class="woocommerce-product-gallery__image">' +
                        '<a href="' + imageData.full_src + '">' +
                        '<img src="' + imageData.src + '" alt="' + imageData.alt + '" class="wp-post-image" />' +
                        '</a></div>';

                    var $currentImage = $productImage.find('.flex-active-slide');
                    if ($currentImage.length) {
                        var $gallery = $('.woocommerce-product-gallery');
                        var galleryData = $gallery.data('flexslider');

                        if (galleryData) {
                            var targetSlide = 0;

                            $gallery.find('img').each(function(index) {
                                if ($(this).attr('src') === imageData.src) {
                                    targetSlide = index;
                                    return false;
                                }
                            });

                            galleryData.flexAnimate(targetSlide);
                        } else {
                            $currentImage.find('img').attr('src', imageData.src);
                            $currentImage.find('a').attr('href', imageData.full_src);
                        }
                    } else {
                        var $img = $productImage.find('img.wp-post-image');
                        if ($img.length) {
                            $img.attr('src', imageData.src).attr('srcset', '');
                        }
                    }
                }
            },
            bindEvents: function() {
                var self = this;
                if (this.bindEventsDone) {
                    return;
                }

                $(document.body).off('wc_variation_form').on('wc_variation_form', function() {
                    self.init();
                });
                this.bindEventsDone = true;
            }
        };

        WPVariation.init();
    });
})(jQuery);