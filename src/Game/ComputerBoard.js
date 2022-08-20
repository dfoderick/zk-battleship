import React from 'react';
import { ContractUtxos } from '../storage';
import { Whatsonchain } from '../web3';
import {
  stateToClass,
  generateEmptyLayout,
  putEntityInLayout,
  SQUARE_STATE,
  indexToCoords,
  updateSunkShips,
} from './layoutHelpers';

export const ComputerBoard = ({
  computerShips,
  gameState,
  hitsByPlayer,
  hitsByComputer,
  setHitsByPlayer,
  handleComputerTurn,
  checkIfGameOver,
  setComputerShips,
  playSound,
  runZK,
  verifiedHitsByPlayer,
  processingHitsByPlayer
}) => {
  // Ships on an empty layout
  let compLayout = computerShips.reduce(
    (prevLayout, currentShip) =>
      putEntityInLayout(prevLayout, currentShip, SQUARE_STATE.ship),
    generateEmptyLayout()
  );

  //  Add hits dealt by player
  compLayout = hitsByPlayer.reduce(
    (prevLayout, currentHit) =>
      putEntityInLayout(prevLayout, currentHit, currentHit.type),
    compLayout
  );

  compLayout = computerShips.reduce(
    (prevLayout, currentShip) =>
      currentShip.sunk
        ? putEntityInLayout(prevLayout, currentShip, SQUARE_STATE.ship_sunk)
        : prevLayout,
    compLayout
  );

  // Check what's at the square and decide what next
  const fireTorpedo = (index) => {
    if (compLayout[index] === 'ship') {
      const newHits = [
        ...hitsByPlayer,
        {
          position: indexToCoords(index),
          type: SQUARE_STATE.hit,
        },
      ];
      setHitsByPlayer(newHits);
      return newHits;
    }
    if (compLayout[index] === 'empty') {
      const newHits = [
        ...hitsByPlayer,
        {
          position: indexToCoords(index),
          type: SQUARE_STATE.miss,
        },
      ];
      setHitsByPlayer(newHits);
      return newHits;
    }
  };

  const playerTurn = gameState === 'player-turn';
  const playerCanFire = playerTurn && !checkIfGameOver();

  let alreadyHit = (index) =>
    compLayout[index] === 'hit' ||
    compLayout[index] === 'miss' ||
    compLayout[index] === 'ship-sunk';

  let compSquares = compLayout.map((square, index) => {
    return (
      <div
        // Only display square if it's a hit, miss, or sunk ship
        className={
          stateToClass[square] === 'hit' ||
          stateToClass[square] === 'miss' ||
          stateToClass[square] === 'ship-sunk'
            ? `square ${stateToClass[square]} ${processingHitsByPlayer.indexOf(index) > -1 ? 'processing' : (verifiedHitsByPlayer.indexOf(index) > -1 ? 'verified' : '')}`
            : `square`
        }
        key={`comp-square-${index}`}
        id={`comp-square-${index}`}
        onClick={async () => {
          if (playerCanFire && !alreadyHit(index)) {

            const newHits = fireTorpedo(index);

            const shipsWithSunkFlag = updateSunkShips(newHits, computerShips);
            const sunkShipsAfter = shipsWithSunkFlag.filter((ship) => ship.sunk).length;
            const sunkShipsBefore = computerShips.filter((ship) => ship.sunk).length;
            if (sunkShipsAfter > sunkShipsBefore) {
              playSound('sunk');
            }

            setComputerShips(shipsWithSunkFlag);

            let indexWasHit = compLayout[index] === 'ship'
          
            let successfulYourHits = newHits.filter((hit) => hit.type === 'hit').length;
            let successfulComputerHits = hitsByComputer.filter((hit) => hit.type === 'hit')
              .length;

            await runZK(index, true, indexWasHit, successfulYourHits, successfulComputerHits)

            setTimeout(() => {
              handleComputerTurn();
            }, 10000);
            
          } else if(verifiedHitsByPlayer.indexOf(index) > -1) {

            const utxo = ContractUtxos.getPlayerUtxoByIndex(index);
      
            if(utxo) {
              window.open(Whatsonchain.getTxUri(utxo.utxo.txId), '_blank').focus();
            } else {
              console.error('utxo not found for index: ', index)
            }
          }
        }}
      />
    );
  });

  return (
    <div>
      <h2 className="player-title">Computer</h2>
      <div className="board">{compSquares}</div>
    </div>
  );
};
