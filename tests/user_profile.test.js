import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

function loadProfileContext() {
    const store = {};
    const context = {
        window: {},
        store,
        indexedDB: { open: () => ({}) },
        localStorage: {
            getItem: (key) => Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null,
            setItem: (key, value) => { store[key] = value; }
        }
    };
    vm.runInNewContext(readFileSync('js/storage.js', 'utf8'), context);
    vm.runInNewContext(readFileSync('js/user_profile.js', 'utf8'), context);
    return context;
}

describe('user profile storage', () => {
    it('saves nickname and birthday through LapisStorage', () => {
        const context = loadProfileContext();
        const profile = context.window.LapisUserProfile.save({
            nickname: '  Alex  ',
            birthday: '1990-05-01'
        });

        expect(profile).toEqual({ nickname: 'Alex', birthday: '1990-05-01' });
        expect(JSON.parse(context.store.lapis_user_profile)).toEqual(profile);
    });

    it('drops invalid birthday values', () => {
        const context = loadProfileContext();
        const profile = context.window.LapisUserProfile.save({
            nickname: 'Alex',
            birthday: 'May 1'
        });

        expect(profile).toEqual({ nickname: 'Alex', birthday: '' });
    });

    it('matches birthdays by month and day', () => {
        const context = loadProfileContext();

        expect(context.window.LapisUserProfile.birthdayMatches('2026-05-01', '1990-05-01')).toBe(true);
        expect(context.window.LapisUserProfile.birthdayMatches('2026-05-02', '1990-05-01')).toBe(false);
    });
});
