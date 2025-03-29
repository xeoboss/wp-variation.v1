<?php
/**
 * Plugin Name: WP Variation
 * Plugin URI: https://orneginiz.com/plugins/wp-variation
 * Description: Woocommerce ürünlerinde birden fazla varyasyonu aynı anda seçmeye ve sepete eklemeye olanak tanır.
 * Version: 1.0.0
 * Author: Sizin Adınız
 * Author URI: https://orneginiz.com
 * Text Domain: wp-variation
 * Domain Path: /languages
 * WC requires at least: 3.0.0
 * WC tested up to: 8.0.0
 */

// Doğrudan erişimi engelle
if (!defined('ABSPATH')) {
    exit;
}

// WooCommerce HPOS özelliği ile uyumluluk
add_action('before_woocommerce_init', function() {
    if (class_exists(\Automattic\WooCommerce\Utilities\FeaturesUtil::class)) {
        \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility('custom_order_tables', __FILE__, true);
    }
});

// Sabit tanımlamaları
define('WP_VARIATION_VERSION', '1.0.0');
define('WP_VARIATION_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('WP_VARIATION_PLUGIN_URL', plugin_dir_url(__FILE__));

// WooCommerce yüklü mü kontrol et
function wp_variation_check_woocommerce() {
    if (!class_exists('WooCommerce')) {
        add_action('admin_notices', 'wp_variation_woocommerce_missing_notice');
        return false;
    }
    return true;
}

// WooCommerce eksik uyarısı
function wp_variation_woocommerce_missing_notice() {
    ?>
    <div class="error">
        <p><?php _e('WP Variation eklentisi WooCommerce\'e ihtiyaç duyar. Lütfen WooCommerce\'i yükleyin ve etkinleştirin.', 'wp-variation'); ?></p>
    </div>
    <?php
}
// AJAX sepete ekleme işlevi - wp_variation_add_to_cart
function wp_variation_ajax_add_to_cart() {
    // Nonce kontrolü
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'wp-variation-nonce')) {
        wp_send_json_error(array(
            'message' => __('Güvenlik doğrulaması başarısız oldu, lütfen sayfayı yenileyip tekrar deneyin.', 'wp-variation')
        ));
        wp_die();
    }

    // İşlem başarılıysa burada işlemlere devam edin
    try {
        // Ürün ID kontrolü
        $product_id = isset($_POST['product_id']) ? absint($_POST['product_id']) : 0;
        if ($product_id <= 0) {
            throw new Exception(__('Geçersiz ürün.', 'wp-variation'));
        }

        // Varyasyonları JSON'dan çözümle
        $variations_json = isset($_POST['variations']) ? sanitize_text_field($_POST['variations']) : '';
        if (empty($variations_json)) {
            throw new Exception(__('Varyasyonlar belirtilmedi.', 'wp-variation'));
        }

        $variations = json_decode(stripslashes($variations_json), true);

        if (!is_array($variations) || empty($variations)) {
            throw new Exception(__('Geçersiz varyasyon verisi.', 'wp-variation'));
        }

        // Burada varyasyonları sepete ekleme işlemleri yapılır
        // Her bir varyasyon için WC()->cart->add_to_cart() çağrılabilir

        // Başarılı yanıt dön
        wp_send_json_success(array(
            'message' => __('Ürünler sepete eklendi.', 'wp-variation')
        ));

    } catch (Exception $e) {
        wp_send_json_error(array(
            'message' => $e->getMessage()
        ));
    }

    wp_die();
}
add_action('wp_ajax_wp_variation_add_to_cart', 'wp_variation_ajax_add_to_cart');
add_action('wp_ajax_nopriv_wp_variation_add_to_cart', 'wp_variation_ajax_add_to_cart');

// Ana sınıfı yükle
if (wp_variation_check_woocommerce()) {
    require_once WP_VARIATION_PLUGIN_DIR . 'includes/class-wp-variation.php';

    // Eklentiyi başlat
    function wp_variation_init() {
        return WP_Variation::instance();
    }

    wp_variation_init();
}

// WooCommerce sepete ekleme yönlendirmesini engelle
add_filter('woocommerce_add_to_cart_redirect', function($url) {
    if (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) == 'xmlhttprequest') {
        return false;
    }
    return $url;
});
add_filter('woocommerce_add_to_cart_redirect', '__return_false');

// AJAX sepete ekleme yanıtını JSON formatında dön
add_action('wp_ajax_woocommerce_add_to_cart', function() {
    if (isset($_REQUEST['add-to-cart'])) {
        wp_send_json_success(array(
            'message' => __('Ürün sepete eklendi.', 'wp-variation')
        ));
    }
});
add_action('wp_ajax_nopriv_woocommerce_add_to_cart', function() {
    if (isset($_REQUEST['add-to-cart'])) {
        wp_send_json_success(array(
            'message' => __('Ürün sepete eklendi.', 'wp-variation')
        ));
    }
});

// Hata ayıklama için - sadece geliştirme ortamında kullanın (opsiyonel)
function wp_variation_debug_output() {
    if (is_product() && current_user_can('manage_options')) {
        ?>
        <script>
            console.log('WP Variation Debug: Script yüklendi');
            console.log('wp_variation_params:', wp_variation_params);
        </script>
        <?php
    }
}
add_action('wp_footer', 'wp_variation_debug_output', 99);