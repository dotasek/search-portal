import React, { useEffect } from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import HomePanel from '../../components/HomePanel'
import { withRouter } from 'react-router-dom'

import * as searchActions from '../../actions/search'
import * as uiStateActions from '../../actions/uiState'
import * as networkActions from '../../actions/network'
import * as sourceActions from '../../actions/source'
import * as cyrestActions from '../../actions/cyrest'

import ReactGA from 'react-ga'

const MainContainer = props => {
  useEffect(() => {
    const { history } = props

    history.listen(({ pathname }) => {
      console.log('(((((((((((((MainPathname =  ====', pathname)
      ReactGA.set({ page: pathname })
      ReactGA.pageview(pathname)
    })
  }, [])
  return <HomePanel {...props} />
}

function mapStateToProps(state) {
  return {
    search: state.search,
    uiState: state.uiState,
    network: state.network,
    source: state.source,
    cyrest: state.cyrest
  }
}

function mapDispatchToProps(dispatch) {
  return {
    searchActions: bindActionCreators(searchActions, dispatch),
    uiStateActions: bindActionCreators(uiStateActions, dispatch),
    networkActions: bindActionCreators(networkActions, dispatch),
    sourceActions: bindActionCreators(sourceActions, dispatch),
    cyrestActions: bindActionCreators(cyrestActions, dispatch)
  }
}

export default withRouter(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )(MainContainer)
)
