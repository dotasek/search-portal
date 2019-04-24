import React, { useEffect } from 'react'

import './style.css'
import MyNetworks from './MyNetworks'
import { Typography } from '@material-ui/core'

const StartPanel = props => {
  useEffect(() => {
   

    
  }, [props.ndexUiState.myNetworks])

  const results = props.ndexUiState.myNetworks
  const sourceUUID = '0'

  return (
    <div className="ndex-container">
      <Typography variant="h5" align="left">My Networks</Typography>
      <MyNetworks hits={results} sourceUUID={sourceUUID} {...props} />
    </div>
  )
}

export default StartPanel
