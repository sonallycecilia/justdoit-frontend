/* JustDoIt Design System bundle — exposes window.JustDoItDesignSystem_dbfb72 */
(function () {
  'use strict';
  var ce = React.createElement;

  function Button(props) {
    var variant = props.variant || 'secondary';
    var size = props.size || 'md';
    var sizeClass = { sm: 'btn--sm', md: 'btn--md', lg: 'btn--lg' }[size] || 'btn--md';
    var variantClass = { primary: 'btn--primary', secondary: 'btn--secondary', ghost: 'btn--ghost', danger: 'btn--danger' }[variant] || 'btn--secondary';
    return ce('button', { className: 'btn ' + variantClass + ' ' + sizeClass, onClick: props.onClick },
      props.leadingIcon || null,
      props.children,
      props.trailingIcon || null
    );
  }

  function Checkbox(props) {
    var shape = props.shape || 'square';
    return ce('input', {
      type: 'checkbox',
      checked: props.checked !== undefined ? props.checked : false,
      onChange: props.onChange || function () {},
      style: {
        width: 18, height: 18,
        accentColor: 'var(--color-accent)',
        cursor: 'pointer',
        flexShrink: 0,
        borderRadius: shape === 'circle' ? '50%' : undefined
      }
    });
  }

  function Badge(props) {
    var tone = props.tone || 'neutral';
    var toneMap = {
      neutral: 'badge--neutral',
      info:    'badge--info',
      warn:    'badge--warning',
      warning: 'badge--warning',
      danger:  'badge--danger',
      success: 'badge--success'
    };
    return ce('span', { className: 'badge ' + (toneMap[tone] || 'badge--neutral') },
      props.dot ? ce('span', { className: 'badge__dot' }) : null,
      props.children
    );
  }

  function ProgressBar(props) {
    var value = props.value !== undefined ? props.value : 0;
    var label = props.label || '';
    return ce('div', { className: 'progress' },
      ce('div', { className: 'progress__head' },
        ce('span', { className: 'progress__label' }, label),
        ce('span', { className: 'progress__value' }, value + '%')
      ),
      ce('div', { className: 'progress__track' },
        ce('div', { className: 'progress__fill', style: { width: value + '%' } })
      )
    );
  }

  window.JustDoItDesignSystem_dbfb72 = {
    Button: Button,
    Checkbox: Checkbox,
    Badge: Badge,
    ProgressBar: ProgressBar
  };
})();
