import { handleActions } from 'redux-actions'
import { CxToJs, CyNetworkUtils } from 'cytoscape-cx2js'
import * as vs from '../assets/data/styles.json'

import {
  ndexNetworkFetchStarted,
  networkFetchStarted,
  networkFetchFailed,
  networkFetchSucceeded,
  networkClear,
  selectNode,
  selectEdge,
  deselectAll,
  setNetworkSize
} from '../actions/network'

const defaultState = {
  isFetching: false,
  uuid: '',
  jobId: '',
  sourceId: '',
  networkName: '',
  queryGenes: [],
  hitGenes: [],
  originalCX: null,
  nodeCount: 0,
  edgeCount: 0,
  niceCX: null,
  network: null,
  style: null,
  layoutScalingFactor: null,
  backgroundColor: null,
  isLayoutComplete: false,
  selectedNode: null,
  selectedEdge: null
}

const utils = new CyNetworkUtils()
const cx2js = new CxToJs(utils)

const PRESET_VS = vs.default[0].style

const PRESET_LAYOUT = {
  name: 'preset',
  padding: 6
}

const COCENTRIC_LAYOUT = {
  name: 'concentric',
  padding: 6,
  minNodeSpacing: 100
}

const COSE_SETTING = {
  name: 'cose',
  padding: 6,
  nodeRepulsion: function(node) {
    return 10080000
  },
  nodeOverlap: 400000,
  idealEdgeLength: function(edge) {
    return 10
  }
}

const SELECTION_COLOR = '#F2355B'

// Standard selection
PRESET_VS.push({
  selector: 'node:selected',
  css: {
    'background-color': 'red',
    color: '#FFFFFF',
    'background-opacity': 1,
    'border-width': 0,
    width: 100,
    height: 100
  }
})

// For class-based style update
const fadedNode = {
  selector: 'node.faded',
  css: {
    opacity: 0.2
  }
}

const fadedEdge = {
  selector: 'edge.faded',
  css: {
    opacity: 0.2
  }
}

const highlight = {
  selector: '.highlight',
  css: {
    opacity: 1.0
  }
}

const activeObject = {
  selector: 'node:active',
  css: {
    'overlay-color': '#FFFF66',
    'overlay-padding': 25,
    'overlay-opacity': 0.3
  }
}

const network = handleActions(
  {
    [ndexNetworkFetchStarted]: (state, payload) => {
      console.log('ndexNetworkFetchStarted', payload.payload)
      return {
        ...state,
        isFetching: true,
        nodeCount: 0,
        edgeCount: 0,
        jobId: null,
        sourceId: null,
        uuid: payload.payload.networkUUID,
        networkName: payload.payload.networkName,
        queryGenes: [],
        hitGenes: [],
        originalCX: null,
        niceCX: null,
        network: null,
        style: null,
        layoutScalingFactor: null,
        backgroundColor: null,
        isLayoutComplete: false
      }
    },
    [networkFetchStarted]: (state, payload) => {
      console.log('Query start: genes = ', payload)
      return {
        ...state,
        isFetching: true,
        nodeCount: 0,
        edgeCount: 0,
        jobId: payload.payload.id,
        sourceId: payload.payload.sourceUUID,
        uuid: payload.payload.networkUUID,
        networkName: payload.payload.networkName,
        queryGenes: payload.payload.geneList,
        hitGenes: payload.payload.hitGenes,
        originalCX: null,
        niceCX: null,
        network: null,
        isLayoutComplete: false,
        backgroundColor: null,
        style: null,
        layoutScalingFactor: 2.0,
        isLayoutComplete: false
      }
    },
    [networkFetchSucceeded]: (state, payload) => {
      let network = {}
      try {
        const cytoscapeJSData = convertCx2cyjs(state, payload.cx)
        network = cytoscapeJSData
      } catch (err) {
        // This is an error state
        console.warn('Could not convert given CX to CYJS:', err)
        throw new Error('Could not convert given CX to CYJS:', err)
      }
      const isLayoutAvailable = network.isLayout
      let layout = PRESET_LAYOUT
      if (!isLayoutAvailable && network.elements && network.elements.length < 500) {
        layout = COSE_SETTING
      } else if (!isLayoutAvailable) {
        layout = COCENTRIC_LAYOUT
      }

      return {
        ...state,
        originalCX: payload.cx,
        ndexData: payload.ndexData,
        niceCX: network.niceCX,
        network: network.elements,
        style: network.style,
        layout: layout,
        backgroundColor: state.backgroundColor
          ? state.backgroundColor
          : network.backgroundColor,
        isFetching: false
      }
    },
    [networkClear]: (state, payload) => {
      return {
        ...state,
        uuid: '',
        originalCX: null,
        niceCX: null,
        network: null,
        style: null,
        layoutScalingFactor: null,
        backgroundColor: null,
        isFetching: false,
        nodeCount: 0,
        edgeCount: 0
      }
    },
    [networkFetchFailed]: (state, payload) => {
      return {
        ...state,
        network: null,
        originalCX: null,
        niceCX: null,
        network: null,
        style: null,
        layoutScalingFactor: null,
        backgroundColor: null,
        isFetching: false,
        nodeCount: 0,
        edgeCount: 0
      }
    },
    [networkClear]: (state, payload) => {
      return {
        ...state,
        uuid: '',
        originalCX: null,
        network: null,
        backgroundColor: null,
        isFetching: false,
        nodeCount: 0,
        edgeCount: 0
      }
    },
    [setNetworkSize]: (state, payload) => {
      return {
        ...state,
        nodeCount: payload.payload.nodeCount,
        edgeCount: payload.payload.edgeCount
      }
    },
    [selectNode]: (state, payload) => {
      return { ...state, selectedNode: payload.payload, selectedEdge: null }
    },
    [selectEdge]: (state, payload) => {
      return { ...state, selectedNode: null, selectedEdge: payload.payload }
    },
    [deselectAll]: (state, payload) => {
      return { ...state, selectedNode: null, selectedEdge: null }
    }
  },
  defaultState
)

const convertCx2cyjs = (network, originalCX) => {
  const attributeNameMap = {}
  const niceCX = utils.rawCXtoNiceCX(originalCX)
  const elementsObj = cx2js.cyElementsFromNiceCX(niceCX, attributeNameMap)

  const updatedStyle = network.style
    ? styleUpdater(network.style, network.queryGenes)
    : styleUpdater(cx2js.cyStyleFromNiceCX(niceCX, attributeNameMap))
  const updatedNodes = network.layoutScalingFactor
    ? adjustLayout(
        elementsObj.nodes,
        network.queryGenes,
        network.layoutScalingFactor
      )
    : elementsObj.nodes
  const elements = [...updatedNodes, ...elementsObj.edges]

  const backgroundColor = cx2js.cyBackgroundColorFromNiceCX(niceCX)

  return {
    niceCX,
    elements,
    style: updatedStyle,
    isLayout: checkLayout(elementsObj.nodes),
    backgroundColor: backgroundColor
  }
}

const VS_TAG = 'cyVisualProperties'
const getBackGround = cx => {
  let color = 'pink'

  const vps = cx.filter(entry => entry[VS_TAG])
  if (vps !== undefined && vps !== null && vps.length !== 0) {
    const vp = vps[0]
    const allVp = vp[VS_TAG]
    const networkVp = allVp.filter(p => p['properties_of'] === 'network')
    return networkVp[0].properties['NETWORK_BACKGROUND_PAINT']
  } else {
    return color
  }
}

// Utility function to get better results
const adjustLayout = (nodes, queryGenes, layoutScalingFactor) => {
  let len = nodes.length

  const upperQuery = new Set(queryGenes.map(gene => gene.toUpperCase()))

  while (len--) {
    const node = nodes[len]
    const position = node.position

    const name = node.data.name ? node.data.name.toUpperCase() : null
    if (upperQuery.has(name)) {
      node.data['query'] = 'true'
    }

    // if (position !== undefined) {
    //   node.position = {
    //     x: position.x * LAYOUT_SCALING_FACTOR,
    //     y: position.y * LAYOUT_SCALING_FACTOR
    //   }
    // }
  }
  return nodes
}

const checkLayout = nodes => {
  // Just checks first node only!
  const node = nodes[0]
  if (node.position === undefined) {
    return false
  } else {
    return true
  }
}

const styleUpdater = style => {
  style.push(fadedNode)
  style.push(fadedEdge)
  style.push(highlight)
  style.push(activeObject)
  return style
}

export default network
