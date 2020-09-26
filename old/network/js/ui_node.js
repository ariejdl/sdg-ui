const node_{sym} = new Node(
  {sym},
  () => [{dependencies}],

  () => [{dependents}],
  [{dependentAllowNulls}],
  () => [{dependentArgs}],

  function () {{
    {initBody}
  }},
  
  function ({namedArgs}) {{
    {body}
  }}
)
