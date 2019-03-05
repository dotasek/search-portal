import { all, call, put, select, takeLatest } from 'redux-saga/effects'
import * as api from '../api/ndex'
import * as cyrest from '../api/cyrest'
import * as myGeneApi from '../api/mygene'
import * as cySearchApi from '../api/search'

import {
  SEARCH_STARTED,
  SEARCH_FAILED,
  SEARCH_SUCCEEDED,
  FETCH_RESULT_STARTED,
  FETCH_RESULT_SUCCEEDED,
  FETCH_RESULT_FAILED
} from '../actions/search'

import {
  FIND_SOURCE_STARTED,
  FIND_SOURCE_FAILED,
  FIND_SOURCE_SUCCEEDED
} from '../actions/source'

import {
  NETWORK_FETCH_STARTED,
  NETWORK_FETCH_SUCCEEDED,
  NETWORK_FETCH_FAILED
} from '../actions/network'

import {
  ADD_PROFILE_STARTED,
  ADD_PROFILE_SUCCEEDED,
  ADD_PROFILE_FAILED,
  SELECT_PROFILE_STARTED,
  SELECT_PROFILE_SUCCEEDED,
  SELECT_PROFILE_FAILED
} from '../actions/profiles'

import {
  SET_NDEX_LOGIN_OPEN,
  SET_PROFILES_OPEN,
  SET_NDEX_IMPORT_OPEN
} from '../actions/uiState'

import {
  SAVE_TO_NDEX_STARTED,
  SAVE_TO_NDEX_SUCCEEDED,
  SAVE_TO_NDEX_FAILED
} from '../actions/ndexImport'
import { notDeepStrictEqual } from 'assert';

export default function* rootSaga() {
  console.log('rootSaga reporting for duty')
  yield takeLatest(SEARCH_STARTED, watchSearch)
  yield takeLatest(FETCH_RESULT_STARTED, watchSearchResult)
  yield takeLatest(NETWORK_FETCH_STARTED, fetchNetwork)
  yield takeLatest(FIND_SOURCE_STARTED, fetchSource)
  yield takeLatest(ADD_PROFILE_STARTED, watchLogin)
  yield takeLatest(SELECT_PROFILE_STARTED, watchProfileSelect)
  yield takeLatest(SAVE_TO_NDEX_STARTED, watchSaveToNDEx)
}

/**
 * Calls Cytoscape Search service and set state
 *
 * @param action
 * @returns {IterableIterator<*>}
 */
function* watchSearch(action) {
  const geneList = action.payload.geneList
  const sourceNames = action.payload.sourceNames
  const geneListString = geneList.join()
  const profiles = yield select(getProfiles)
  try {
    // Call 1: Send query and get JobID w/ gene props from MyGene
    const [geneRes, ndexRes, searchRes] = yield all([
      call(myGeneApi.searchGenes, geneListString),
      call(api.searchNetwork, geneListString, profiles.selectedProfile),
      call(cySearchApi.postQuery, geneList, sourceNames)
    ])

    const geneJson = yield call([geneRes, 'json'])
    // const json = yield call([ndexRes, 'json'])

    const resultLocation = searchRes.headers.get('Location')
    const parts = resultLocation.split('/')
    const jobId = parts[parts.length - 1]

    // TODO: Parallelize this!

    const filtered = filterGenes(geneJson)

    yield put({
      type: SEARCH_SUCCEEDED,
      payload: {
        genes: filtered.uniqueGeneMap,
        notFound: filtered.notFound,
        resultLocation,
        jobId
      }
    })
  } catch (e) {
    console.warn('NDEx search error:', e)
    yield put({
      type: SEARCH_FAILED,
      payload: {
        message: 'NDEx network search error',
        query: geneListString,
        error: e.message
      }
    })
  }
}

function* watchSearchResult(action) {
  const jobId = action.payload.jobId
  console.log('SR fetch:', jobId)

  try {
    const statusRes = yield call(cySearchApi.checkStatus, jobId)
    const statusJson = yield call([statusRes, 'json'])

    console.log('SR fetch result:', statusJson)

    yield put({
      type: FETCH_RESULT_SUCCEEDED,
      payload: {
        searchStatus: statusJson
      }
    })
  } catch (e) {
    console.warn('NDEx search error:', e)
    yield put({
      type: FETCH_RESULT_FAILED,
      payload: {
        message: 'Failed to fetch search result',
        jobId,
        error: e.message
      }
    })
  }
}

function* fetchNetwork(action) {
  try {
    const uuid = action.payload.uuid
    const profiles = yield select(getProfiles)
    const cx = yield call(api.fetchNetwork, uuid, profiles.selectedProfile)
    const json = yield call([cx, 'json'])

    yield put({ type: NETWORK_FETCH_SUCCEEDED, cx: json })
  } catch (error) {
    yield put({ type: NETWORK_FETCH_FAILED, error })
  }
}

function* fetchSource(action) {
  try {
    const sources = yield call(cySearchApi.getSource, null)
    const json = yield call([sources, 'json'])

    yield put({ type: FIND_SOURCE_SUCCEEDED, sources: json.results })
  } catch (error) {
    yield put({ type: FIND_SOURCE_FAILED, error })
  }
}

export const getProfiles = state => state.profiles

function* watchLogin(action) {
  const profile = action.payload
  //const profile = {
  //  userId: 'dotasek',
  //  userName: 'D Otasek',
  //  serverAddress: 'dev.ndexbio.org',
  //  image: defaultProfilePic
  //}
  yield put({
    type: ADD_PROFILE_SUCCEEDED,
    payload: profile
  })
  let profiles = yield select(getProfiles)
  window.localStorage.setItem(
    'profiles',
    JSON.stringify(profiles.availableProfiles)
  )
  window.localStorage.setItem('selectedProfile', JSON.stringify(profile))
  yield put({ type: SET_NDEX_LOGIN_OPEN, payload: false })
  yield put({ type: SET_PROFILES_OPEN, payload: { isProfilesOpen: false } })
}

function* watchProfileSelect(action) {
  window.localStorage.setItem('selectedProfile', JSON.stringify(action.payload))
  const profile = action.payload
  if (!profile.hasOwnProperty('userId')) {
    if (
      profile.hasOwnProperty('serverAddress') &&
      profile.hasOwnProperty('userName') &&
      !profile.hasOwnProperty('userId')
    ) {
      if (profile.userName !== '') {
        try {
          const response = yield call(api.fetchUser, profile)
          if (!response.ok) {
            throw Error()
          }
          const blob = response.json()

          const newProfile = Object.assign(profile, {
            userId: blob.externalId,
            firstName: blob.firstName,
            image: blob.image
          })
          const availableProfiles = yield select(
            getProfiles
          ).availableProfiles.filter(p => p !== profile)
          availableProfiles.push(newProfile)

          yield put({
            type: SELECT_PROFILE_SUCCEEDED,
            payload: {
              profile: newProfile,
              availableProfiles: availableProfiles
            }
          })
          window.localStorage.setItem(
            'profiles',
            JSON.stringify(availableProfiles)
          )
          window.localStorage.setItem(
            'selectedProfile',
            JSON.stringify(newProfile)
          )
        } catch (error) {
          yield put({ type: SELECT_PROFILE_FAILED, payload: error })
          //  alert(
          //    'Unable to update profile from NDEx. Try logging in again'
          //  )
          //TODO: REINTRODUCE THIS
          //main.handleProfileLogout(profile)
          //main.handleProfileDelete(profile)
          //})
        }
      } else {
        const availableProfiles = yield select(
          getProfiles
        ).availableProfiles.filter(p => p !== profile)
        availableProfiles.push(profile)
        yield put({
          type: SELECT_PROFILE_SUCCEEDED,
          payload: {
            selectedProfile: profile,
            availableProfiles: availableProfiles
          }
        })
        window.localStorage.setItem(
          'profiles',
          JSON.stringify(availableProfiles)
        )
        window.localStorage.setItem('selectedProfile', JSON.stringify(profile))
      }
    }
  } else {
    const profiles = yield select(getProfiles)
    yield put({
      type: SELECT_PROFILE_SUCCEEDED,
      payload: {
        selectedProfile: profile,
        availableProfiles: profiles.availableProfiles
      }
    })
  }
}

export const getUIState = state => state.uiState

function* watchSaveToNDEx(action) {
  const uiState = yield select(getUIState)
  const cyrestport = uiState.urlParams.has('cyrestport')
    ? uiState.urlParams.get('cyrestport')
    : 1234

  const profiles = yield select(getProfiles)
  console.log("Profiles: ", profiles)
  const selectedProfile = profiles.selectedProfile
  console.log("Selected profile: ", selectedProfile)

  const { serverAddress, userName, password } = selectedProfile

  const metadata = {
    name: action.payload.state.name,
    author: action.payload.state.author,
    organism: action.payload.state.organism,
    version: action.payload.state.version,
    disease: action.payload.state.disease,
    tissue: action.payload.state.tissue,
    rightsHolder: action.payload.state.rightsHolder,
    reference: action.payload.state.reference,
    description: action.payload.state.description
  }

  const payloadObj = {
    username: userName,
    password: password,
    serverUrl: serverAddress + '/v2',
    metadata: metadata
  }

  let method = 'POST'
  if (action.payload.state.overwrite) {
    method = 'PUT'
  } else {
    payloadObj.isPublic = action.payload.state.public
  }
  const payload = JSON.stringify(payloadObj)

  console.log('action.payload.networkData', action.payload.networkData)

  const suid = action.payload.networkData[action.payload.state.saveType]['suid']

  if (userName === undefined || userName === '') {
    alert('You must be logged with your NDEx username to save a network.')
    return
  }

  const response = yield call(
    cyrest.cyndex2Networks,
    cyrestport,
    method,
    suid,
    payload
  )

  if (response.errors && response.errors.length !== 0) {
    alert('Error saving: ' + response.errors[0].message || 'Unknown')
    yield put({ type: SAVE_TO_NDEX_FAILED, payload: response.errors[0] })
    yield put({ type: SET_NDEX_IMPORT_OPEN, payload: false })
  } else {
    //this.saveImage(resp.data.suid, resp.data.uuid)
    var shareURL = null
    if (action.payload.state.public) {
      shareURL =
        selectedProfile.serverAddress + '/#/network/' + response.data.uuid
    }
    yield put({ type: SAVE_TO_NDEX_SUCCEEDED, payload: {} })
    yield put({ type: SET_NDEX_IMPORT_OPEN, payload: false })
  }
}

const filterGenes = resultList => {
  const uniqueGeneMap = new Map()
  const notFound = []

  let len = resultList.length
  while (len--) {
    const entry = resultList[len]
    if (entry.notfound) {
      notFound.push(entry.query)
    } else {
      uniqueGeneMap.set(entry.query, entry)
    }
  }

  return {
    uniqueGeneMap,
    notFound
  }
}
