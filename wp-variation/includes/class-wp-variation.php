<?php
/**
 * WP Variation ana sınıfı
 */

if (!defined('ABSPATH')) {
    exit;
}

class WP_Variation {
    /**
     * Singleton instance
     *
     * @var WP_Variation
     */
    protected static $_instance = null;


    /**
     * Singleton pattern için instance getter
     *
     * @return WP_Variation
     */
    public static function instance() {
        if (is_null(self::$_instance)) {
            self::$_instance = new self();
        }
        return self::$_instance;
    }

    /**
     * Font Awesome'u sayfaya dahil et
     */
    public function enqueue_font_awesome() {
        wp_enqueue_style('font-awesome', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css', array(), '4.7.0');
    }


    /**
     * Constructor
     */
    public function __construct()
    {
        $this->init_hooks();

        // WooCommerce sepete ekleme fonksiyonlarıyla ilgili filtrelerin önceliğini azalt
        add_filter('woocommerce_add_to_cart_validation', '__return_true', 999);

        // Sepet session'ını zorlayarak aktifleştir
        add_action('init', function () {
            if (function_exists('WC') && !is_admin()) {
                if (!WC()->session->has_session()) {
                    WC()->session->set_customer_session_cookie(true);
                }
            }
        }, 1);

        // AJAX tamamlama için fragmantları ayarla
        add_filter('woocommerce_add_to_cart_fragments', function ($fragments) {
            ob_start();
            woocommerce_mini_cart();
            $mini_cart = ob_get_clean();

            $fragments['div.widget_shopping_cart_content'] = '<div class="widget_shopping_cart_content">' . $mini_cart . '</div>';
            return $fragments;
        });

        // WooCommerce sepete ekleme yönlendirmesini engelle
        add_filter('woocommerce_add_to_cart_redirect', function ($url) {
            if (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) == 'xmlhttprequest') {
                return false;
            }
            return $url;
        });
    }
    /**
     * Hook'ları başlat
     */
    private function init_hooks() {
        // Script ve stilleri yükle
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));

        // Varyasyon gösterimini değiştir
        add_filter('woocommerce_locate_template', array($this, 'override_woocommerce_template'), 10, 3);

        // Sepete ekleme işlemini özelleştir
        add_action('wp_ajax_wp_variation_add_to_cart', array($this, 'ajax_add_to_cart'));
        add_action('wp_ajax_nopriv_wp_variation_add_to_cart', array($this, 'ajax_add_to_cart'));
    }

    /**
     * Script ve stilleri yükle
     */
    public function enqueue_scripts() {
        if (is_product()) {
            $product = wc_get_product(get_the_ID());

            if ($product && $product->is_type('variable')) {
                // CSS dosyasını yükle
                wp_enqueue_style(
                    'wp-variation-css',
                    WP_VARIATION_PLUGIN_URL . 'assets/css/wp-variation.css',
                    array(),
                    WP_VARIATION_VERSION
                );

                // JS dosyasını yükle
                wp_enqueue_script(
                    'wp-variation-js',
                    WP_VARIATION_PLUGIN_URL . 'assets/js/wp-variation.js',
                    array('jquery', 'wc-add-to-cart-variation'),
                    WP_VARIATION_VERSION,
                    true
                );

                // JS'ye veri aktarma - Tek bir tanımlama yaparak çakışmayı önle
                wp_localize_script(
                    'wp-variation-js',
                    'wp_variation_params',
                    array(
                        'ajax_url' => admin_url('admin-ajax.php'),
                        'nonce' => wp_create_nonce('wp-variation-nonce'),
                        'i18n_add_another' => __('Başka Ekle', 'wp-variation'),
                        'i18n_remove' => __('Kaldır', 'wp-variation'),
                        'i18n_select_options' => __('Lütfen seçenekleri belirleyin', 'wp-variation'),
                        'i18n_select_all_options' => __('Lütfen tüm seçenekleri belirleyin', 'wp-variation'),
                        'i18n_select_some_options' => __('Lütfen bazı seçenekleri belirleyin', 'wp-variation'),
                        'i18n_unavailable' => __('Maalesef, bu varyasyon stokta yok.', 'wp-variation'),
                        'i18n_ajax_error' => __('İstek sırasında bir hata oluştu. Lütfen tekrar deneyin.', 'wp-variation'),
                        'i18n_added_to_cart' => __('Ürün sepete eklendi!', 'wp-variation'),
                        'i18n_add_to_cart_button' => __('Sepete Ekle', 'wp-variation')
                    )
                );
            }
        }
    }
    /**
     * WooCommerce şablonunu değiştir
     */
    public function override_woocommerce_template($template, $template_name, $template_path) {
        // Varyasyon gösterim şablonunu değiştir
        if ($template_name == 'single-product/add-to-cart/variable.php') {
            $template = WP_VARIATION_PLUGIN_DIR . 'templates/variable.php';

            // Eğer şablon dosyamız yoksa, yeni oluştur
            if (!file_exists($template)) {
                // Ana dizini oluştur
                if (!file_exists(WP_VARIATION_PLUGIN_DIR . 'templates/')) {
                    mkdir(WP_VARIATION_PLUGIN_DIR . 'templates/', 0755, true);
                }

                // Orijinal şablonu al
                $original_template = wc_locate_template('single-product/add-to-cart/variable.php', '', WC()->template_path());

                // Şablonu yeni konuma kopyala
                copy($original_template, $template);
            }
        }

        return $template;
    }

    /**
     * AJAX ile varyasyon sepete ekleme işlemi
     */
    public function ajax_add_to_cart() {
        // Log all request data for debugging
        error_log('WP_VARIATION ADD TO CART REQUEST: ' . print_r($_POST, true));

        try {
            // Nonce kontrolü
            if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'wp-variation-nonce')) {
                throw new Exception(__('Güvenlik doğrulaması başarısız oldu.', 'wp-variation'));
            }

            // Ürün ID kontrolü
            $product_id = isset($_POST['product_id']) ? absint($_POST['product_id']) : 0;
            if ($product_id <= 0) {
                throw new Exception(__('Geçersiz ürün.', 'wp-variation'));
            }

            // Varyasyonları JSON'dan çözümle
            $variations_json = isset($_POST['variations']) ? wp_unslash($_POST['variations']) : '';
            if (empty($variations_json)) {
                throw new Exception(__('Varyasyon verisi eksik.', 'wp-variation'));
            }

            $variations = json_decode($variations_json, true);
            error_log('Çözülen varyasyon verisi: ' . print_r($variations, true));

            if (!is_array($variations) || empty($variations)) {
                throw new Exception(__('Geçersiz varyasyon verisi.', 'wp-variation'));
            }

            // Sepete başarıyla eklenen ürün sayısı
            $added_count = 0;
            $error_messages = array();
            $cart = WC()->cart;

            // Cart null kontrolü
            if (!$cart) {
                throw new Exception(__('Sepet objesi bulunamadı.', 'wp-variation'));
            }

            // Her bir varyasyonu sepete ekle
            foreach ($variations as $index => $variation_data) {
                error_log('İşlenen varyasyon #' . $index . ': ' . print_r($variation_data, true));

                // Gerekli alanların kontrolü
                $variation_id = isset($variation_data['variation_id']) ? absint($variation_data['variation_id']) : 0;
                $quantity = isset($variation_data['quantity']) ? absint($variation_data['quantity']) : 1;

                if ($variation_id <= 0) {
                    $error_messages[] = __('Geçersiz varyasyon.', 'wp-variation');
                    continue;
                }

                // Varyasyon ürünü kontrol et
                $variation_product = wc_get_product($variation_id);
                if (!$variation_product) {
                    $error_messages[] = sprintf(__('Varyasyon #%d bulunamadı.', 'wp-variation'), $variation_id);
                    error_log('Varyasyon bulunamadı: ' . $variation_id);
                    continue;
                }

                error_log('Bulunan varyasyon: ' . $variation_product->get_name());

                // Ürün ana ürünü kontrol et
                $parent_product = wc_get_product($product_id);
                if (!$parent_product) {
                    $error_messages[] = __('Ana ürün bulunamadı.', 'wp-variation');
                    error_log('Ana ürün bulunamadı: ' . $product_id);
                    continue;
                }

                // Varyasyon nitelikleri
                $attributes = array();
                if (isset($variation_data['attributes'])) {
                    $attributes = $variation_data['attributes'];
                }

                // Log before adding to cart
                error_log("Sepete ekleme deneniyor: Product ID: $product_id, Variation ID: $variation_id, Quantity: $quantity");
                error_log("Nitelikler: " . print_r($attributes, true));

                // WooCommerce'in doğrulama filtrelerini uygula
                $passed_validation = apply_filters('woocommerce_add_to_cart_validation', true, $product_id, $quantity, $variation_id, $attributes);

                if ($passed_validation) {
                    // DOĞRUDAN SEPET SINIFINI KULLAN
                    $result = $cart->add_to_cart($product_id, $quantity, $variation_id, $attributes);

                    if ($result) {
                        $added_count++;
                        error_log("Sepete ekleme başarılı! Sonuç: " . $result);
                    } else {
                        $error_messages[] = sprintf(__('Varyasyon #%d sepete eklenemedi.', 'wp-variation'), $variation_id);
                        error_log("Sepete ekleme başarısız oldu: Varyasyon ID: $variation_id");
                    }
                } else {
                    $error_messages[] = sprintf(__('Varyasyon #%d doğrulama hatası.', 'wp-variation'), $variation_id);
                    error_log("Doğrulama başarısız oldu: Varyasyon ID: $variation_id");
                }
            }

            // Sepet içeriğini logla
            $cart_items = WC()->cart->get_cart();
            error_log('Sepet içeriği: ' . print_r($cart_items, true));

            // Sepet toplam ürün sayısı
            $cart_count = WC()->cart->get_cart_contents_count();
            error_log('Sepetteki toplam ürün sayısı: ' . $cart_count);

            // WooCommerce sepet cookie'lerini zorla güncelle
            WC()->cart->maybe_set_cart_cookies();

            // Sepeti kaydettir
            WC()->session->set('cart', WC()->cart->get_cart_for_session());

            // Sonuç gönder
            if ($added_count > 0) {
                // WooCommerce fragmanlarını al
                $fragments = apply_filters('woocommerce_add_to_cart_fragments', array(
                    'div.widget_shopping_cart_content' => '<div class="widget_shopping_cart_content">' . do_shortcode('[woocommerce_mini_cart]') . '</div>',
                ));

                $data = array(
                    'message' => sprintf(_n('%d ürün sepete eklendi.', '%d ürün sepete eklendi.', $added_count, 'wp-variation'), $added_count),
                    'fragments' => $fragments,
                    'cart_hash' => WC()->cart->get_cart_hash(),
                    'cart_quantity' => WC()->cart->get_cart_contents_count()
                );

                error_log('Başarılı yanıt gönderiliyor: ' . print_r($data, true));
                wp_send_json_success($data);
            } else {
                $error_data = array(
                    'message' => __('Hiçbir ürün sepete eklenemedi.', 'wp-variation'),
                    'errors' => $error_messages
                );
                error_log('Hata yanıtı gönderiliyor: ' . print_r($error_data, true));
                wp_send_json_error($error_data);
            }

        } catch (Exception $e) {
            error_log('WP Variation Sepete Ekleme Hatası: ' . $e->getMessage());
            wp_send_json_error(array(
                'message' => $e->getMessage()
            ));
        }

        wp_die();
    }
}
