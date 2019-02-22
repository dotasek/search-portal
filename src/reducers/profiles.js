import { handleActions } from 'redux-actions'
import {
  selectProfile,
  addProfileStarted,
  addProfileFailed,
  addProfileSucceeded,
  deleteProfile
} from '../actions/profiles'
import defaultProfilePic from '../assets/images/default-profile.png'

const DEF_PROFILE = {
  userId: 'xxxyyy1',
  userName: 'dotasek',
  serverAddress: 'ndexbio.org',
  image: defaultProfilePic
}

const DEF_PROFILE_2 = {
  userId: 'xxxyyy2',
  userName: 'dotasek',
  serverAddress: 'dev.ndexbio.org',
  image: defaultProfilePic
}

const DEF_STATE = {
  selectedProfile: DEF_PROFILE,
  availableProfiles: [DEF_PROFILE, DEF_PROFILE_2]
}

const profiles = handleActions(
  {
    [addProfileStarted]: (state, payload) => {
      console.log('addProfileStarted = ', payload.payload)
      return {
        ...state
      }
    },
    [addProfileFailed]: (state, payload) => {
      console.log('addProfileFailed = ', payload.payload)
      return {
        ...state
      }
    },
    [addProfileSucceeded]: (state, payload) => {
      console.log('addProfileSucceeded = ', payload.payload)
      //window.localStorage.setItem('profiles', JSON.stringify(this.state.profiles))
      //window.localStorage.setItem('selectedProfile', JSON.stringify(profile))
      return {
        ...state,
        selectedProfile: payload.payload,
        availableProfiles: state.availableProfiles.concat([payload.payload])
      }
    },
    [selectProfile]: (state, payload) => {
      //window.localStorage.setItem('selectedProfile', JSON.stringify(payload.payload))
      const profile = payload.payload
      if (!profile.hasOwnProperty('userId')) {
        if (
          profile.hasOwnProperty('serverAddress') &&
          profile.hasOwnProperty('userName') &&
          !profile.hasOwnProperty('userId')
        ) {
          if (profile.userName !== '') {
            fetch(profile.serverAddress + '/v2/user?valid=true', {
              headers: new Headers({
                Authorization:
                  'Basic ' + btoa(profile.userName + ':' + profile.password)
              })
            })
              .then(response => {
                if (!response.ok) {
                  throw Error()
                }
                return response.json()
              })
              .then(blob => {
                const newProfile = Object.assign(profile, {
                  userId: blob.externalId,
                  firstName: blob.firstName,
                  image: blob.image
                })
                const availableProfiles = state.availableProfiles.filter(
                  p => p !== profile
                )
                availableProfiles.push(newProfile)
                return {
                  ...state,
                  selectedProfile: newProfile,
                  availableProfiles: availableProfiles
                }
                //window.localStorage.setItem('profiles', JSON.stringify(profiles))
                //window.localStorage.setItem('selectedProfile', JSON.stringify(newProfile))
              })
              .catch(error => {
                alert(
                  'Unable to update profile from NDEx. Try logging in again'
                )
                //TODO: REINTRODUCE THIS
                //main.handleProfileLogout(profile)
                //main.handleProfileDelete(profile)
              })
          } else {
            const availableProfiles = state.availableProfiles.filter(
              p => p !== profile
            )
            availableProfiles.push(profile)
            return {
              ...state,
              selectedProfile: profile,
              availableProfiles: availableProfiles
            }
            //window.localStorage.setItem('profiles', JSON.stringify(profiles))
            //window.localStorage.setItem('selectedProfile', JSON.stringify(profile))
          }
        }
      } else {
        return {
          ...state,
          selectedProfile: profile
        }
      }
    },
    [deleteProfile]: (state, payload) => {
      const profiles = state.availableProfiles.filter(
        p => p !== payload.payload
      )
      return {
        ...state,
        availableProfiles: profiles
      }
    }
  },
  DEF_STATE
)

export default profiles
