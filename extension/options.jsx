/* globals chrome */

import React, {useState, useCallback, useEffect} from 'react'
import {render} from 'react-dom'

import {
  getPermissionsString,
  readPermissions,
  removePermissions
} from './common'

function Options() {
  let [relays, setRelays] = useState([])
  let [newRelayURL, setNewRelayURL] = useState('')
  let [permissions, setPermissions] = useState()
  let [message, setMessage] = useState('')

  const showMessage = useCallback(msg => {
    setMessage(msg)
    setTimeout(setMessage, 3000)
  })

  useEffect(() => {
    chrome.storage.local.get(['relays']).then(results => {
      if (results.relays) {
        let relaysList = []
        for (let url in results.relays) {
          relaysList.push({
            url,
            policy: results.relays[url]
          })
        }
        setRelays(relaysList)
      }
    })
  }, [])

  useEffect(() => {
    loadPermissions()
  }, [])

  function loadPermissions() {
    readPermissions().then(permissions => {
      setPermissions(
        Object.entries(permissions).map(
          ([host, {level, condition, created_at}]) => ({
            host,
            level,
            condition,
            created_at
          })
        )
      )
    })
  }

  return (
    <>
      <h1>horse</h1>
      <p>nostr remote hardware signer extension</p>
      <h2>options</h2>
      <div style={{marginBottom: '10px'}}>
        <div style={{display: 'flex', alignItems: 'center'}}>
          <span>preferred relays:</span>
          <button style={{marginLeft: '20px'}} onClick={saveRelays}>
            save
          </button>
        </div>
        <div style={{marginLeft: '10px'}}>
          {relays.map(({url, policy}, i) => (
            <div key={i} style={{display: 'flex'}}>
              <input
                style={{marginRight: '10px', width: '400px'}}
                value={url}
                onChange={changeRelayURL.bind(null, i)}
              />
              <label>
                read
                <input
                  type="checkbox"
                  checked={policy.read}
                  onChange={toggleRelayPolicy.bind(null, i, 'read')}
                />
              </label>
              <label>
                write
                <input
                  type="checkbox"
                  checked={policy.write}
                  onChange={toggleRelayPolicy.bind(null, i, 'write')}
                />
              </label>
            </div>
          ))}
          <div style={{display: 'flex'}}>
            <input
              style={{width: '400px'}}
              value={newRelayURL}
              onChange={e => setNewRelayURL(e.target.value)}
              onBlur={addNewRelay}
            />
          </div>
        </div>
      </div>
      <div style={{marginBottom: '10px'}}>
        {permissions?.length > 0 && (
          <>
            <h2>permissions</h2>
            <table>
              <thead>
                <tr>
                  <th>domain</th>
                  <th>permissions</th>
                  <th>condition</th>
                  <th>since</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {permissions.map(({host, level, condition, created_at}) => (
                  <tr key={host}>
                    <td>{host}</td>
                    <td>{getPermissionsString(level)}</td>
                    <td>{condition}</td>
                    <td>
                      {new Date(created_at * 1000)
                        .toISOString()
                        .split('.')[0]
                        .split('T')
                        .join(' ')}
                    </td>
                    <td>
                      <button onClick={handleRevoke} data-domain={host}>
                        revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
      <div style={{marginTop: '12px', fontSize: '120%'}}>{message}</div>
    </>
  )

  function changeRelayURL(i, ev) {
    setRelays([
      ...relays.slice(0, i),
      {url: ev.target.value, policy: relays[i].policy},
      ...relays.slice(i + 1)
    ])
  }

  function toggleRelayPolicy(i, cat) {
    setRelays([
      ...relays.slice(0, i),
      {
        url: relays[i].url,
        policy: {...relays[i].policy, [cat]: !relays[i].policy[cat]}
      },
      ...relays.slice(i + 1)
    ])
  }

  function addNewRelay() {
    relays.push({
      url: newRelayURL,
      policy: {read: true, write: true}
    })
    setRelays(relays)
    setNewRelayURL('')
  }

  async function handleRevoke(e) {
    let host = e.target.dataset.domain
    if (window.confirm(`revoke all permissions from ${host}?`)) {
      await removePermissions(host)
      showMessage(`removed permissions from ${host}`)
      loadPermissions()
    }
  }

  async function saveRelays() {
    await chrome.storage.local.set({
      relays: Object.fromEntries(
        relays
          .filter(({url}) => url.trim() !== '')
          .map(({url, policy}) => [url.trim(), policy])
      )
    })
    showMessage('saved relays!')
  }
}

render(<Options />, document.getElementById('main'))
