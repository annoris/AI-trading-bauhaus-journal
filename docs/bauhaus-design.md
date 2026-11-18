# Trading Bauhaus visual system

All pages use the shared CSS tokens in `apps/web/src/app/globals.css` and UI components under `apps/web/src/components/ui`. Keep page-specific colors out of new components.

- Canvas: near-black, with charcoal cards and subtle borders.
- Brand and primary actions: green; loss values remain red, with signed amounts.
- Navigation: a green tint and leading marker identify the current page.
- Cards: rounded corners, restrained shadow, consistent padding and titles.
- Controls: rounded inputs, green focus rings and clear disabled states.
- Light mode: the same structure with accessible green actions on a light canvas.
- All product text is English.

The supplied logo and agenda are stored unchanged in `apps/web/public/images/notebook`. The shared logo uses `trading_bauhaus_logo.png`; Notebook welcome uses `trading_bauhaus_agenda.png`. Both display directly without image optimization or color filters.

The sidebar collapses, tables retain scrolling, and Notebook keeps the editor mounted during resizing. Empty notebooks use the welcome panel on mobile as well as desktop.
