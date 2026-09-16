<?php
/**
 * Curated Studios– minimal block theme setup.
 */

add_action( 'after_setup_theme', function () {
	add_theme_support( 'post-thumbnails' );
	add_theme_support( 'responsive-embeds' );
	add_theme_support( 'custom-logo', [ 'flex-width' => true, 'flex-height' => true ] );
	add_theme_support( 'html5', [ 'search-form', 'gallery', 'caption', 'style', 'script' ] );
	add_theme_support( 'wp-block-styles' );
} );

add_action( 'wp_enqueue_scripts', function () {
	// filemtime = auto cache-bust, style.css version stays untouched.
	$css = get_template_directory() . '/assets/css/glass.css';
	$js  = get_template_directory() . '/assets/js/carousel.js';
	wp_enqueue_style( 'curated-studios', get_template_directory_uri() . '/assets/css/glass.css', [], filemtime( $css ) );
	if ( is_front_page() ) {
		wp_enqueue_script(
			'curated-studios-carousel',
			get_template_directory_uri() . '/assets/js/carousel.js',
			[],
			filemtime( $js ),
			[ 'strategy' => 'defer', 'in_footer' => true ]
		);
		// Loader runs in <head> (no defer) so black paints before first content paint.
		$loader = get_template_directory() . '/assets/js/loader.js';
		wp_enqueue_script( 'curated-studios-loader', get_template_directory_uri() . '/assets/js/loader.js', [], filemtime( $loader ), false );
		$logo_id = get_theme_mod( 'custom_logo' );
		wp_localize_script( 'curated-studios-loader', 'photoLoader', [
			'logo' => $logo_id ? wp_get_attachment_image_url( $logo_id, 'medium' ) : '',
			'name' => get_bloginfo( 'name' ),
		] );
	}
	if ( is_post_type_archive( 'shoot' ) ) {
		$flow = get_template_directory() . '/assets/js/coverflow.js';
		wp_enqueue_script(
			'curated-studios-coverflow',
			get_template_directory_uri() . '/assets/js/coverflow.js',
			[],
			filemtime( $flow ),
			[ 'strategy' => 'defer', 'in_footer' => true ]
		);
	}
} );

// ponytail: one CPT in theme (not plugin) – fine until you reuse shoots on a 2nd site.
add_action( 'init', function () {
	register_post_type( 'shoot', [
		'label'         => __( 'Shoots', 'curated-studios' ),
		'public'        => true,
		'show_in_rest'  => true,
		'has_archive'   => true,
		'rewrite'       => [ 'slug' => 'portfolio' ],
		'menu_icon'     => 'dashicons-camera',
		'supports'      => [ 'title', 'editor', 'thumbnail', 'excerpt' ],
		'show_in_nav_menus' => true,
		'template'      => [
			[ 'core/cover', [ 'useFeaturedImage' => true, 'dimRatio' => 40, 'minHeight' => 420 ] ],
			[ 'core/paragraph', [ 'placeholder' => 'Tell the story of this shoot…' ] ],
			[ 'core/gallery', [ 'columns' => 2, 'linkTo' => 'none' ] ],
		],
	] );

	register_taxonomy( 'shoot_type', 'shoot', [
		'label'        => __( 'Shoot types', 'curated-studios' ),
		'public'       => true,
		'show_in_rest' => true,
		'hierarchical' => true,
		'rewrite'      => [ 'slug' => 'type' ],
	] );
} );

// Cover link per shoot: custom URL for the coverflow (empty = shoot page).
// ponytail: one text meta + tiny sidebar panel instead of an ACF dependency.
add_action( 'init', function () {
	register_post_meta( 'shoot', '_shoot_link', [
		'type'          => 'string',
		'single'        => true,
		'show_in_rest'  => true,
		'auth_callback' => fn() => current_user_can( 'edit_posts' ),
	] );
} );

add_action( 'enqueue_block_editor_assets', function () {
	$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
	if ( $screen && $screen->post_type === 'shoot' ) {
		$js = get_template_directory() . '/assets/js/shoot-link.js';
		wp_enqueue_script(
			'curated-studios-shoot-link',
			get_template_directory_uri() . '/assets/js/shoot-link.js',
			[ 'wp-plugins', 'wp-edit-post', 'wp-components', 'wp-data', 'wp-element' ],
			filemtime( $js ),
			true
		);
	}
} );

// Point shoot card links (image + title) at the custom URL when set.
add_filter( 'render_block', function ( $html, $block ) {
	if ( ! in_array( $block['blockName'], [ 'core/post-featured-image', 'core/post-title' ], true ) ) {
		return $html;
	}
	$post_id = get_the_ID();
	if ( ! $post_id || get_post_type( $post_id ) !== 'shoot' ) {
		return $html;
	}
	$url = get_post_meta( $post_id, '_shoot_link', true );
	if ( ! $url ) {
		return $html;
	}
	return preg_replace( '/href="[^"]*"/', 'href="' . esc_url( $url ) . '"', $html, 1 );
}, 10, 2 );

// 301: old /work/* URLs (bookmarks, Google) land on /portfolio/*.
add_action( 'template_redirect', function () {
	$path = strtok( $_SERVER['REQUEST_URI'] ?? '', '?' ) ?: '/';
	if ( ! preg_match( '#(^|/)work(/|$)#', $path ) ) {
		return;
	}
	$home_path = rtrim( (string) wp_parse_url( home_url(), PHP_URL_PATH ), '/' );
	$rel = $home_path !== '' && str_starts_with( $path, $home_path )
		? substr( $path, strlen( $home_path ) )
		: $path;
	wp_redirect( home_url( preg_replace( '#/work(?=/|$)#', '/portfolio', $rel, 1 ) ), 301 );
	exit;
} );

// Perf: keep srcset/lazy-load from core, no extra image sizes.
add_filter( 'big_image_size_threshold', fn() => 2560 );
