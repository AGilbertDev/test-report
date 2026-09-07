'use strict'

// A failed test becomes an error annotation on its own line, so it shows in the
// Files changed tab where the reviewer already is. This uses the workflow's own
// annotation channel and needs no extra permission.
function annotate(core, failures, prefix = '') {
  for (const f of failures) {
    const file = prefix ? `${prefix.replace(/\/$/, '')}/${f.file}` : f.file
    const props = { title: f.name }
    if (f.line) {
      props.file = file
      props.startLine = f.line
      if (f.column) props.startColumn = f.column
    }
    core.error(f.message || 'Test failed', props)
  }
}

module.exports = { annotate }
