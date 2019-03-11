import React from 'react'
import { withStyles } from '@material-ui/core/styles'
import ListItemText from '@material-ui/core/ListItemText'
import ListItemAvatar from '@material-ui/core/ListItemAvatar'
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction'

import Avatar from '@material-ui/core/Avatar'
import Typography from '@material-ui/core/Typography'

import deepOrange from '@material-ui/core/colors/deepOrange'

import MenuList from '@material-ui/core/MenuList'
import MenuItem from '@material-ui/core/MenuItem'

import * as cyRESTApi from '../../../api/cyrest'
import './style.css'
import Sorter from './Sorter'


const styles = theme => ({
  inline: {
    display: 'inline'
  },
  subtitle: {
    marginLeft: '1em',
    marginTop: '0.5em'
  },
  networkAvatar: {
    margin: 10,
    color: '#fff',
    backgroundColor: deepOrange[500]
  },
  menuItem: {
    height: '4em',
    '&:focus': {
      backgroundColor: 'rgba(200,205,200,0.5)',
      '& $primary, & $icon': {
        color: theme.palette.common.white
      }
    }
  },
  menuText: {
    '&:focus': {
      '& $primary, & $icon': {
        color: theme.palette.common.white
      }
    }
  },
  secondary: {
    width: '15em',
    display: 'flex',
    alignItems: 'center',
    padding: '0.2em'
  },
  plot: {
    width: '80%',
    background: 'teal'
  }
})

const checkCytoscapeConnection = props => {
  console.log(props.uiState.urlParams)
  cyRESTApi
    .status(
      props.uiState.urlParams.has('cyrestport')
        ? props.uiState.urlParams.get('cyrestport')
        : 1234
    )
    .catch(e => {
      throw Error(e)
    })
    .then(res => handleErrors(res))
    .then(running => {
      props.uiStateActions.setCytoscapeStatus(true)
    })
    .catch(error => {
      props.uiStateActions.setCytoscapeStatus(false)
    })
}

const handleErrors = res => {
  console.log('Calling!!', res)
  if (res !== undefined) {
    return true
  }

  return false
}

const NetworkList = props => {
  const { classes, hits, sourceUUID } = props

  const geneList = props.search.geneList

  const id = props.search.results.jobId
  const handleFetch = (networkUUID, networkName) => {
    checkCytoscapeConnection(props)
    props.networkActions.networkFetchStarted({
      id,
      sourceUUID,
      networkUUID,
      networkName,
      geneList
    })
  }

  const getListItem = (networkEntry, classes) => {
    const {
      description,
      networkUUID,
      percentOverlap,
      nodes,
      edges
    } = networkEntry

    return (
      <MenuItem
        className={classes.menuItem}
        alignItems="flex-start"
        key={networkUUID}
        onClick={val => handleFetch(networkUUID, description)}
      >
        <ListItemAvatar>
          <Avatar className={classes.networkAvatar}>N</Avatar>
        </ListItemAvatar>
        <ListItemText
          className={classes.menuText}
          primary={description}
          secondary={
            <React.Fragment>
              <Typography
                component="span"
                className={classes.inline}
                color="textPrimary"
              >
                {'Nodes: ' + nodes + ', Edges: ' + edges}
              </Typography>
              <Typography variant="caption">
                {'UUID: ' + networkUUID}
              </Typography>
            </React.Fragment>
          }
        />
        <ListItemSecondaryAction className={classes.secondary}>
          <div
            style={{
              background: 'lightGreen',
              color: 'white',
              height: '2em',
              width: percentOverlap + '%'
            }}
          >
            <Typography variant="h6">{percentOverlap + '%'}</Typography>
          </div>
        </ListItemSecondaryAction>
      </MenuItem>
    )
  }

  if (!hits) {
    return <div className="network-list-wrapper" />
  }

  return (
    <div className="network-list-wrapper">
      <Sorter />
      <div className="network-list">
        <MenuList>{hits.map(entry => getListItem(entry, classes))}</MenuList>
      </div>
    </div>
  )
}

export default withStyles(styles)(NetworkList)
