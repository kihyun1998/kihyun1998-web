import { afterEach, describe, expect, it, vi } from 'vitest';
import { homeLinks, sectionTitle, shownSection } from './home';
import { BLOG_URL, GITHUB_URL } from './site';

describe('the home sections', () => {
  it('each have the title the nav shows', () => {
    expect(sectionTitle('open-source')).toBe('Open Source');
    expect(sectionTitle('online')).toBe('Online');
  });

  it('give the one link to the Blog in the Blog section', () => {
    expect(homeLinks.blog).toEqual([{ name: 'blog.kihyun1998.com', href: BLOG_URL }]);
  });

  it('give the GitHub profile and the Blog in the Online section', () => {
    expect(homeLinks.online).toEqual([
      { name: 'GitHub', meta: 'kihyun1998', href: GITHUB_URL },
      { name: 'Blog', meta: 'blog.kihyun1998.com', href: BLOG_URL },
    ]);
  });
});

describe('shownSection', () => {
  afterEach(() => shownSection.set(null));

  it('is null before the Cabin reports anything', () => {
    expect(shownSection.get()).toBeNull();
  });

  it("is the screen's tab while the view is zoomed to it", () => {
    shownSection.set({ zoomed: true, tab: 'projects' });
    expect(shownSection.get()).toBe('projects');
  });

  it('is null at the seat, whatever tab the screen holds', () => {
    shownSection.set({ zoomed: true, tab: 'projects' });
    shownSection.set({ zoomed: false, tab: 'projects' });
    expect(shownSection.get()).toBeNull();
  });

  it('is null once the Cabin is gone', () => {
    shownSection.set({ zoomed: true, tab: 'online' });
    shownSection.set(null);
    expect(shownSection.get()).toBeNull();
  });

  it('follows a tab change while zoomed', () => {
    shownSection.set({ zoomed: true, tab: 'about' });
    shownSection.set({ zoomed: true, tab: 'blog' });
    expect(shownSection.get()).toBe('blog');
  });

  it('notifies once per change of the shown section and not otherwise', () => {
    const listener = vi.fn();
    const unsubscribe = shownSection.subscribe(listener);
    shownSection.set({ zoomed: false, tab: 'about' });
    expect(listener).toHaveBeenCalledTimes(0);
    shownSection.set({ zoomed: true, tab: 'about' });
    expect(listener).toHaveBeenCalledTimes(1);
    shownSection.set({ zoomed: true, tab: 'about' });
    expect(listener).toHaveBeenCalledTimes(1);
    shownSection.set({ zoomed: true, tab: 'online' });
    expect(listener).toHaveBeenCalledTimes(2);
    shownSection.set({ zoomed: false, tab: 'online' });
    expect(listener).toHaveBeenCalledTimes(3);
    unsubscribe();
    shownSection.set({ zoomed: true, tab: 'online' });
    expect(listener).toHaveBeenCalledTimes(3);
  });
});
