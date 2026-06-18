// Single source of truth for the v6 mobile/desktop split. CSS media queries and
// the useIsMobile() hook must both reference this so layout and JS agree.
export const MOBILE_MAX_WIDTH = 767
export const MOBILE_MEDIA_QUERY = `(max-width: ${MOBILE_MAX_WIDTH}px)`
